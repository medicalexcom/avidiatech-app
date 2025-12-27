import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";

/**
 * Pipeline output fetch endpoint (user + internal)
 *
 * - Internal calls: x-pipeline-secret === PIPELINE_INTERNAL_SECRET
 * - User calls: requires Clerk auth AND org access to the pipeline run (run.org_id)
 *
 * Returns:
 * {
 *   pipelineRunId,
 *   module: { index, name, status },
 *   output_ref,
 *   output: any
 * }
 */

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; moduleIndex: string }> }) {
  const req = _req as Request;

  const providedSecret = (req.headers.get("x-pipeline-secret") || "").toString();
  const expectedSecret = process.env.PIPELINE_INTERNAL_SECRET || "";
  const isInternalCall = Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase_not_configured", message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const { id, moduleIndex } = await ctx.params;
  const idx = Number(moduleIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > 1000) {
    return NextResponse.json({ error: "invalid_module_index" }, { status: 400 });
  }

  // Access control
  if (!isInternalCall) {
    const { userId } = (await auth()) as any;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: runRow, error: runErr } = await supabase
      .from("pipeline_runs")
      .select("id, org_id")
      .eq("id", id)
      .maybeSingle();

    if (runErr) return NextResponse.json({ error: "run_query_failed", detail: runErr.message }, { status: 500 });
    if (!runRow || runRow.org_id !== orgId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  } else {
    const { data: runCheck, error: runErr } = await supabase.from("pipeline_runs").select("id").eq("id", id).maybeSingle();
    if (runErr) return NextResponse.json({ error: "run_query_failed", detail: runErr.message }, { status: 500 });
    if (!runCheck) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: mod, error: modErr } = await supabase
    .from("module_runs")
    .select("id, module_index, module_name, status, output_ref")
    .eq("pipeline_run_id", id)
    .eq("module_index", idx)
    .maybeSingle();

  if (modErr) return NextResponse.json({ error: "module_query_failed", detail: modErr.message }, { status: 500 });
  if (!mod) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!mod.output_ref) {
    return NextResponse.json({ error: "output_not_ready", status: mod.status, message: "Module has no output_ref yet." }, { status: 409 });
  }

  const bucket = process.env.PIPELINE_OUTPUTS_BUCKET || "pipeline-outputs";
  const { data, error: dlErr } = await supabase.storage.from(bucket).download(mod.output_ref);

  if (dlErr || !data) {
    return NextResponse.json({ error: "output_download_failed", detail: dlErr?.message ?? String(dlErr), output_ref: mod.output_ref }, { status: 500 });
  }

  const text = await data.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(
      {
        pipelineRunId: id,
        module: { index: mod.module_index, name: mod.module_name, status: mod.status },
        output_ref: mod.output_ref,
        output: json,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        pipelineRunId: id,
        module: { index: mod.module_index, name: mod.module_name, status: mod.status },
        output_ref: mod.output_ref,
        error: "output_not_json",
        raw: text,
      },
      { status: 200 }
    );
  }
}
