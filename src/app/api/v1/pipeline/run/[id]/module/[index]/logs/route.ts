import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return logs for a specific pipeline module run.
 * - Normalizes context.params because Next's context.params can be a Promise in some Next versions.
 * - Tries to read structured logs from pipeline_module_logs, falls back to module error stored on pipeline_runs.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, context: any) {
  try {
    // normalize params (context.params may be a Promise)
    let params = context?.params;
    if (params && typeof params?.then === "function") {
      params = await params;
    }
    const runId = params?.id;
    const moduleIndexRaw = params?.index;
    const moduleIndex = moduleIndexRaw != null ? Number(moduleIndexRaw) : NaN;

    if (!runId || Number.isNaN(moduleIndex)) {
      return NextResponse.json({ ok: false, error: "run id and module index required" }, { status: 400 });
    }

    // Try to fetch structured logs from pipeline_module_logs (if exists)
    const { data: rows, error } = await supaAdmin
      .from("pipeline_module_logs")
      .select("*")
      .eq("pipeline_run_id", runId)
      .eq("module_index", moduleIndex)
      .order("created_at", { ascending: true })
      .limit(2000);

    if (!error && (rows ?? []).length) {
      return NextResponse.json({ ok: true, logs: rows });
    }

    // Fallback: read module error from pipeline_runs table if available
    const { data: runData, error: runErr } = await supaAdmin
      .from("pipeline_runs")
      .select("modules")
      .eq("id", runId)
      .single();

    if (runErr) {
      // If table not present or other error, return helpful message
      return NextResponse.json({ ok: false, error: "No logs found and pipeline_runs table not available" }, { status: 404 });
    }

    const modules = runData?.modules ?? [];
    const mod = modules.find((m: any) => Number(m.module_index) === moduleIndex);
    if (mod) {
      const fallbackLogs = mod.error ? [typeof mod.error === "string" ? mod.error : JSON.stringify(mod.error)] : [];
      return NextResponse.json({ ok: true, fallback: true, module: mod, logs: fallbackLogs });
    }

    return NextResponse.json({ ok: false, error: "No logs found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
