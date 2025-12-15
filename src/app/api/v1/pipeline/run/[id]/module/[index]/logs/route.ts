import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return logs for a specific pipeline module run.
 * - Expects a pipeline_module_logs table or similar. If not present, returns a helpful message.
 * - This is an MVP: if logs table isn't present, returns module's error field (if available).
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, { params }: { params: { id: string; index: string } }) {
  try {
    const runId = params.id;
    const moduleIndex = Number(params.index);

    // Try to fetch structured logs from pipeline_module_logs (if exists)
    const { data: rows, error } = await supaAdmin.from("pipeline_module_logs").select("*").eq("pipeline_run_id", runId).eq("module_index", moduleIndex).order("created_at", { ascending: true }).limit(1000);
    if (!error && (rows ?? []).length) {
      return NextResponse.json({ ok: true, logs: rows });
    }

    // Fallback: return module record error from pipeline_runs modules if available
    const { data: runData, error: runErr } = await supaAdmin.from("pipeline_runs").select("modules").eq("id", runId).single();
    if (runErr) {
      return NextResponse.json({ ok: false, error: "No logs found and pipeline_runs table not available" }, { status: 404 });
    }
    const modules = runData?.modules ?? [];
    const mod = modules.find((m: any) => m.module_index === moduleIndex);
    if (mod) {
      return NextResponse.json({ ok: true, fallback: true, module: mod, logs: mod.error ? [String(mod.error)] : [] });
    }

    return NextResponse.json({ ok: false, error: "No logs found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
