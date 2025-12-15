import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET /api/v1/pipeline/run/:id
 * Return detailed pipeline run including module timings/artifact metadata.
 */
export async function GET(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { id: pipelineRunId } = context?.params ?? {};
    if (!pipelineRunId) return NextResponse.json({ ok: false, error: "pipelineRunId required" }, { status: 400 });

    const { data: runRow, error } = await supaAdmin.from("pipeline_runs").select("*").eq("id", pipelineRunId).single();
    if (error) throw error;
    if (!runRow || runRow.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    // compute simple module durations if modules array has start/end timestamps
    const modules = (runRow.modules ?? []).map((m: any) => {
      const started = m.started_at ? new Date(m.started_at).getTime() : null;
      const ended = m.ended_at ? new Date(m.ended_at).getTime() : null;
      return { ...m, durationMs: started && ended ? Math.max(0, ended - started) : null };
    });

    return NextResponse.json({ ok: true, run: { ...runRow, modules } });
  } catch (err: any) {
    console.error("GET pipeline run details error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
