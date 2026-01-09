import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";
import { encryptSecrets } from "@/lib/integrations/encryption";

/**
 * POST /api/v1/integrations/ecommerce/bigcommerce
 *
 * Expected body:
 * { storeHash: string, accessToken: string }
 *
 * Behavior:
 * - Require Clerk session (auth())
 * - Validate storeHash + token by calling BigCommerce products API (limit=1)
 * - Encrypt token with shared encryption helper and insert into ecommerce_connections
 * - Return helpful JSON errors when validation fails
 */

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function validateBigCommerceCredentials(storeHash: string, token: string) {
  try {
    const res = await fetch(`https://api.bigcommerce.com/stores/${encodeURIComponent(storeHash)}/v3/catalog/products?limit=1`, {
      method: "GET",
      headers: {
        "X-Auth-Token": token,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail: txt };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, status: 0, detail: String(err?.message ?? err) };
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!orgId) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const storeHash: string | undefined = (body.storeHash ?? body.store_hash ?? "").trim();
    const accessToken: string | undefined = (body.accessToken ?? body.access_token ?? "").trim();

    if (!storeHash || !accessToken) {
      return NextResponse.json(
        { ok: false, error: "missing_fields", missing: { storeHash: !storeHash, accessToken: !accessToken } },
        { status: 400 }
      );
    }

    // Validate BigCommerce credentials before writing to DB
    const test = await validateBigCommerceCredentials(storeHash, accessToken);
    if (!test.ok) {
      // Provide explicit error to help user fix token/permissions
      return NextResponse.json(
        { ok: false, error: "bigcommerce_validation_failed", detail: test.detail, status: test.status },
        { status: 400 }
      );
    }

    // Optional org name lookup
    let tenantName: string | null = null;
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      tenantName = org?.name ?? null;
    } catch {
      // ignore
    }

    const tenantId = await getOrCreateTenantIdFromClerkOrg({
      clerkOrgId: orgId,
      clerkUserId: userId,
      tenantName,
    });

    const supabase = getSupabaseAdmin();
    // Use the shared encryption helper so other code can decrypt
    const secrets_enc = encryptSecrets({ access_token: accessToken });

    const insert = await supabase
      .from("ecommerce_connections")
      .insert({
        tenant_id: tenantId,
        platform: "bigcommerce",
        status: "active",
        config: { store_hash: storeHash },
        secrets_enc,
      })
      .select("id, tenant_id, platform, status, config, created_at")
      .single();

    if (insert.error) {
      return NextResponse.json({ ok: false, error: "db_insert_failed", detail: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, connection: insert.data }, { status: 200 });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[bigcommerce][error]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
