import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";
import { logAction } from "@/lib/audit/logAction";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET/POST /api/v1/integrations/:id/schedule
 * GET: list schedules for the integration (org-scoped)
 * POST: create/replace schedule (admin only)
 */
export async function GET(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { id: integrationId } = context?.params ?? {};
    if (!integrationId) return NextResponse.json({ ok: false, error: "integration id required" }, { status: 400 });

    const { data, error } = await supaAdmin.from("integration_schedules").select("*").eq("integration_id", integrationId).eq("org_id", orgId);
    if (error) throw error;
    return NextResponse.json({ ok: true, schedules: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    await throwIfNotAdmin(req, orgId);

    const { id: integrationId } = context?.params ?? {};
    if (!integrationId) return NextResponse.json({ ok: false, error: "integration id required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { cron_expression, timezone = "UTC", enabled = true } = body;
    if (!cron_expression) return NextResponse.json({ ok: false, error: "cron_expression required" }, { status: 400 });

    const { data, error } = await supaAdmin
      .from("integration_schedules")
      .insert({ org_id: orgId, integration_id: integrationId, cron_expression, timezone, enabled })
      .select("*")
      .single();

    if (error) throw error;

    // audit
    await logAction(req, { orgId, action: "create_schedule", resource: "integration_schedule", resourceId: data.id, meta: { cron_expression, timezone } });

    return NextResponse.json({ ok: true, schedule: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
