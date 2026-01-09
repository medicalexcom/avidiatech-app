import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";

/**
 * GET /api/v1/ecommerce_connections?tenantId=org_<clerk> or tenant_uuid
 * - If tenantId starts with "org_" we map to tenant UUID via tenants.clerk_org_id
 * - If tenantId omitted, we attempt to derive Clerk org from the session
 *
 * Response:
 * { ok: true, connections: [ { id, tenant_id, platform, status, config, created_at, updated_at } ] }
 *
 * Does NOT include secrets_enc.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Keep this here to fail fast on misconfiguration during runtime
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for ecommerce_connections route");
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function resolveTenantIdFromClerkOrg(clerkOrgId: string) {
  try {
    const { data, error } = await supaAdmin
      .from("tenants")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[ecommerce_connections] tenant lookup failed:", error.message);
      return null;
    }
    if (!data) return null;
    return data.id;
  } catch (err: any) {
    console.error("[ecommerce_connections] tenant lookup exception:", String(err?.message ?? err));
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qTenant = (url.searchParams.get("tenantId") ?? url.searchParams.get("orgId") ?? "").trim();

    let tenantId: string | null = null;

    if (qTenant) {
      if (qTenant.startsWith("org_")) {
        tenantId = await resolveTenantIdFromClerkOrg(qTenant);
      } else {
        tenantId = qTenant;
      }
    } else {
      // derive clerk org from session request if possible
      const orgFromReq = await getOrgFromRequest(req); // should return clerk org id like "org_..."
      if (orgFromReq) {
        tenantId = await resolveTenantIdFromClerkOrg(orgFromReq);
      }
    }

    if (!tenantId) {
      // Return empty list rather than error (keeps the UI simple)
      return NextResponse.json({ ok: true, connections: [] }, { status: 200 });
    }

    const { data, error } = await supaAdmin
      .from("ecommerce_connections")
      .select("id, tenant_id, platform, status, config, created_at, updated_at")
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
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ ok: true, connections }, { status: 200 });
  } catch (err: any) {
    console.error("[ecommerce_connections][GET] error:", String(err?.message ?? err));
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
