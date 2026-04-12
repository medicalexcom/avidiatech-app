import { NextResponse } from "next/server";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { encryptSecrets } from "@/lib/integrations/encryption";
import { getServerSupabase } from "@/lib/supabase";

/**
 * Collection route for ecommerce_connections
 * - GET  /api/v1/ecommerce_connections?tenantId=org_|tenant_uuid
 * - POST /api/v1/ecommerce_connections
 *
 * POST body for BigCommerce:
 * {
 *   provider: "bigcommerce",
 *   storeHash: "abc123",
 *   accessToken: "store_api_token",
 *   name?: "Friendly name"
 * }
 *
 * Generic POST body:
 * {
 *   provider: "shopify" | "woocommerce" | ...,
 *   config: { ... },
 *   secrets?: { ... } // will be encrypted server-side
 *   name?: "Friendly name"
 * }
 *
 * Response:
 * { ok: true, connections: [...] } or { ok: true, connection: { ... } }
 */


async function resolveTenantIdFromClerkOrg(clerkOrgId: string) {
  try {
    const { data, error } = await getServerSupabase()
      .from("tenants")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[ecommerce_connections] tenant lookup failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err: any) {
    console.error("[ecommerce_connections] tenant lookup exception:", String(err?.message ?? err));
    return null;
  }
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qTenant = (url.searchParams.get("tenantId") ?? url.searchParams.get("orgId") ?? "").trim();

    let tenantId: string | null = null;
    if (qTenant) {
      if (qTenant.startsWith("org_")) tenantId = await resolveTenantIdFromClerkOrg(qTenant);
      else tenantId = qTenant;
    } else {
      const orgFromReq = await getOrgFromRequest(req);
      if (orgFromReq) tenantId = await resolveTenantIdFromClerkOrg(orgFromReq);
    }

    if (!tenantId) return NextResponse.json({ ok: true, connections: [] }, { status: 200 });

    const { data, error } = await getServerSupabase()
      .from("ecommerce_connections")
      .select("id, tenant_id, platform, status, config, name, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ecommerce_connections] fetch failed:", error.message);
      return NextResponse.json({ ok: false, error: "fetch_failed", detail: error.message }, { status: 500 });
    }

    const connections = (data ?? []).map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      platform: r.platform,
      status: r.status,
      config: r.config ?? {},
      name: r.name ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ ok: true, connections }, { status: 200 });
  } catch (err: any) {
    console.error("[ecommerce_connections][GET] error:", String(err?.message ?? err));
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider = (body.provider ?? body.platform ?? "").toString().trim().toLowerCase();

    // resolve tenant id (accept tenantId or orgId in query OR derive from session)
    const url = new URL(req.url);
    const qTenant = (url.searchParams.get("tenantId") ?? url.searchParams.get("orgId") ?? "").trim();
    let tenantId: string | null = null;
    if (qTenant) {
      tenantId = qTenant.startsWith("org_") ? await resolveTenantIdFromClerkOrg(qTenant) : qTenant;
    } else {
      const orgFromReq = await getOrgFromRequest(req);
      if (orgFromReq) tenantId = await resolveTenantIdFromClerkOrg(orgFromReq);
    }

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "missing_tenant", detail: "tenant not resolvable from session or params" }, { status: 400 });
    }

    // Provider-specific handling
    if (provider === "bigcommerce") {
      const storeHash: string = (body.storeHash ?? body.store_hash ?? "").toString().trim();
      const accessToken: string = (body.accessToken ?? body.access_token ?? "").toString().trim();
      const nameProvided: string | undefined = ((body.name ?? "").toString().trim() || undefined);

      if (!storeHash || !accessToken) {
        return NextResponse.json({ ok: false, error: "missing_fields", missing: { storeHash: !storeHash, accessToken: !accessToken } }, { status: 400 });
      }

      // Validate BC creds
      const test = await validateBigCommerceCredentials(storeHash, accessToken);
      if (!test.ok) {
        return NextResponse.json({ ok: false, error: "bigcommerce_validation_failed", detail: test.detail, status: test.status }, { status: 400 });
      }

      const secrets_enc = encryptSecrets({ access_token: accessToken });
      const config: Record<string, any> = { store_hash: storeHash };
      if (nameProvided) config.store_name = nameProvided;

      const insert = await getServerSupabase()
        .from("ecommerce_connections")
        .insert({
          tenant_id: tenantId,
          platform: "bigcommerce",
          name: nameProvided ?? null,
          status: "active",
          config,
          secrets_enc,
        })
        .select("id, tenant_id, platform, status, config, name, created_at, updated_at")
        .single();

      if (insert.error) {
        console.error("[ecommerce_connections][POST] db insert error:", insert.error.message);
        return NextResponse.json({ ok: false, error: "db_insert_failed", detail: insert.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, connection: insert.data }, { status: 200 });
    }

    // Generic provider create: accept config + optional secrets object
    if (!provider) {
      return NextResponse.json({ ok: false, error: "missing_provider" }, { status: 400 });
    }

    const config = body.config ?? {};
    const secrets = body.secrets ?? null;
    let secrets_enc: string | null = null;
    if (secrets) {
      try {
        secrets_enc = encryptSecrets(secrets);
      } catch (err: any) {
        console.error("[ecommerce_connections][POST] secrets encrypt failed:", String(err?.message ?? err));
        return NextResponse.json({ ok: false, error: "secrets_encrypt_failed", detail: String(err?.message ?? err) }, { status: 500 });
      }
    } else {
      // keep existing not-null constraint in mind:
      // If your table requires secrets_enc non-null, write an encrypted-empty value
      secrets_enc = encryptSecrets({});
    }

    const nameProvided: string | undefined = ((body.name ?? "").toString().trim() || undefined);

    const insert = await getServerSupabase()
      .from("ecommerce_connections")
      .insert({
        tenant_id: tenantId,
        platform: provider,
        name: nameProvided ?? null,
        status: "active",
        config,
        secrets_enc,
      })
      .select("id, tenant_id, platform, status, config, name, created_at, updated_at")
      .single();

    if (insert.error) {
      console.error("[ecommerce_connections][POST] db insert error:", insert.error.message);
      return NextResponse.json({ ok: false, error: "db_insert_failed", detail: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, connection: insert.data }, { status: 200 });
  } catch (err: any) {
    console.error("[ecommerce_connections][POST] exception:", String(err?.message ?? err));
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
