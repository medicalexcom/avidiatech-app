import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET /api/v1/pipeline/run/:id/module/:index/logs?page=1&pageSize=100
 * Returns paged logs for the pipeline_run module.
 * Falls back to pipeline_runs.modules[index].error if no logs are found.
 */
export async function GET(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { id: pipelineRunId, index } = context?.params ?? {};
    const moduleIndex = Number(index ?? 0);

    if (!pipelineRunId) return NextResponse.json({ ok: false, error: "pipelineRunId required" }, { status: 400 });

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(1000, Math.max(10, Number(url.searchParams.get("pageSize") ?? "200")));
    const offset = (page - 1) * pageSize;

    // verify run belongs to org
    const { data: runRow, error: runErr } = await supaAdmin.from("pipeline_runs").select("id,org_id,modules").eq("id", pipelineRunId).single();
    if (runErr) throw runErr;
    if (!runRow || runRow.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    // fetch logs from pipeline_module_logs if present
    const { data: logs, error: logsErr } = await supaAdmin
      .from("pipeline_module_logs")
      .select("*")
      .eq("pipeline_run_id", pipelineRunId)
      .eq("module_index", moduleIndex)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (logsErr) throw logsErr;
    if (logs && logs.length) {
      return NextResponse.json({ ok: true, logs, page, pageSize });
    }

    // fallback: if runRow.modules exists and includes an error snapshot, return that
    const modules = runRow.modules ?? [];
    const moduleSnapshot = Array.isArray(modules) && modules[moduleIndex] ? modules[moduleIndex] : null;
    if (moduleSnapshot && moduleSnapshot.error) {
      return NextResponse.json({
        ok: true,
        logs: [{ level: "error", message: moduleSnapshot.error, created_at: runRow.updated_at ?? new Date().toISOString() }],
        page: 1,
        pageSize: 1,
      });
    }

    return NextResponse.json({ ok: true, logs: [], page, pageSize });
  } catch (err: any) {
    console.error("GET module logs error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
