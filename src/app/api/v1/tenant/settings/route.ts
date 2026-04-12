import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/**
 * GET /api/v1/tenant/settings
 * Returns tenant-level settings for current tenant.
 */
export async function GET(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const supa = adminClient();
    if (!supa) return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });

    const { data, error } = await supa.from("tenants").select("id, monitor_all").eq("id", orgId).maybeSingle();
    if (error) throw error;

    // If tenant row not found, still respond deterministically (default ON)
    const monitor_all = data?.monitor_all ?? true;

    return NextResponse.json({ ok: true, tenantId: orgId, settings: { monitor_all } }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/tenant/settings
 * Body: { monitor_all: boolean }
 * Admin-only.
 */
export async function PATCH(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    await throwIfNotAdmin(req, orgId);

    const supa = adminClient();
    if (!supa) return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as any;
    if (typeof body?.monitor_all !== "boolean") {
      return NextResponse.json({ ok: false, error: "monitor_all_boolean_required" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("tenants")
      .update({ monitor_all: body.monitor_all })
      .eq("id", orgId)
      .select("id, monitor_all")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, tenantId: orgId, settings: { monitor_all: data?.monitor_all ?? body.monitor_all } }, { status: 200 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
