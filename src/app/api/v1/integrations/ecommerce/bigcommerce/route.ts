import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser, getCurrentTenantId } from "@/lib/auth";
import { encryptSecrets } from "@/lib/integrations/encryption";

/**
 * POST /api/v1/integrations/ecommerce/bigcommerce
 * Body: { storeHash | store_hash, accessToken | access_token, name? }
 *
 * This version uses the simple auth helpers present in your repo:
 * - getCurrentUser(req?) and getCurrentTenantId(req?) from src/lib/auth.ts
 *
 * NOTE: In production you should replace these with real session/Clerk checks.
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
    // Minimal auth using your helpers (replace with Clerk/session later)
    const user = await getCurrentUser(req);
    const tenantId = getCurrentTenantId(req);

    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!tenantId) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const storeHash: string = (body.storeHash ?? body.store_hash ?? "").trim();
    const accessToken: string = (body.accessToken ?? body.access_token ?? "").trim();
    const nameProvided: string | undefined = (body.name ?? "").trim() || undefined;

    if (!storeHash || !accessToken) {
      return NextResponse.json(
        { ok: false, error: "missing_fields", missing: { storeHash: !storeHash, accessToken: !accessToken } },
        { status: 400 }
      );
    }

    // Validate BigCommerce credentials before writing to DB
    const test = await validateBigCommerceCredentials(storeHash, accessToken);
    if (!test.ok) {
      return NextResponse.json(
        { ok: false, error: "bigcommerce_validation_failed", detail: test.detail, status: test.status },
        { status: 400 }
      );
    }

    // Prepare Supabase admin client and write connection row
    const supabase = getSupabaseAdmin();
    const secrets_enc = encryptSecrets({ access_token: accessToken });

    // Decide a UI-friendly name: provided name > tenant id (or storeHash fallback)
    const connectionName = nameProvided ?? `store-${storeHash}`;

    const insert = await supabase
      .from("ecommerce_connections")
      .insert({
        tenant_id: tenantId,
        platform: "bigcommerce",
        name: connectionName,
        status: "active",
        config: { store_hash: storeHash },
        secrets_enc,
      })
      .select("id, tenant_id, platform, status, config, name, created_at, updated_at")
      .single();

    if (insert.error) {
      console.error("[bigcommerce] db insert error:", insert.error.message);
      return NextResponse.json({ ok: false, error: "db_insert_failed", detail: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, connection: insert.data }, { status: 200 });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[bigcommerce][error]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
