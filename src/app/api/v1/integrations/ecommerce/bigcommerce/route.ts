import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Replace with your real encryption util if it exists in-repo.
async function encryptSecretsOrThrow(accessToken: string): Promise<string> {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key) throw new Error("missing_encryption_key");
  return Buffer.from(JSON.stringify({ accessToken }), "utf8").toString("base64");
}

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: "missing_tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const storeHash: string | undefined = body.storeHash ?? body.store_hash;
    const accessToken: string | undefined = body.accessToken ?? body.access_token;

    if (!storeHash || !accessToken) {
      return NextResponse.json(
        { error: "missing_fields", missing: { storeHash: !storeHash, accessToken: !accessToken } },
        { status: 400 }
      );
    }

    // Optional org name lookup (safe for your Clerk version)
    let tenantName: string | null = null;
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      tenantName = org?.name ?? null;
    } catch {
      // ignore (name is optional)
    }

    const tenantId = await getOrCreateTenantIdFromClerkOrg({
      clerkOrgId: orgId,
      clerkUserId: userId,
      tenantName,
    });

    const supabase = getSupabaseAdmin();
    const secrets_enc = await encryptSecretsOrThrow(accessToken);

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
      return NextResponse.json({ error: "db_insert_failed", detail: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, connection: insert.data }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: msg === "missing_encryption_key" ? 500 : 500 });
  }
}
