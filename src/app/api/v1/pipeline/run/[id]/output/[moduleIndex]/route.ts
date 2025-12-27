import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/v1/pipeline/run/:id/output/:moduleIndex
 *
 * Auth:
 * - Internal: x-pipeline-secret === PIPELINE_INTERNAL_SECRET
 * - User: must be signed in via Clerk AND own the run via pipeline_runs.created_by
 *
 * Ownership mapping:
 * - pipeline_runs.created_by (uuid) references profiles.id (uuid)
 * - profiles has a column that stores the Clerk user id (string). Configure CLERK_ID_COL below.
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// TODO: set this after we inspect the profiles table schema.
const CLERK_ID_COL = "clerk_user_id"; // common alternatives: "user_id", "clerk_id"

export async function GET(req: Request, context: any) {
  try {
    const providedSecret = String(req.headers.get("x-pipeline-secret") || "");
    const expectedSecret = String(process.env.PIPELINE_INTERNAL_SECRET || "");
    const isInternalCall = Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "supabase_not_configured", detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 503 }
      );
    }

    const params = context?.params && typeof context.params.then === "function" ? await context.params : context?.params;
    const pipelineRunId = params?.id;
    const moduleIndexRaw = params?.moduleIndex;

    if (!pipelineRunId) return NextResponse.json({ ok: false, error: "pipelineRunId required" }, { status: 400 });

    const idx = Number(moduleIndexRaw);
    if (!Number.isInteger(idx) || idx < 0 || idx > 1000) {
      return NextResponse.json({ ok: false, error: "invalid_module_index" }, { status: 400 });
    }

    // User auth + ownership check (skip for internal callers)
    if (!isInternalCall) {
      const { userId } = (await auth()) as any;
      if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

      // Load profile id for this Clerk user
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        // @ts-expect-error dynamic column name
        .eq(CLERK_ID_COL, userId)
        .maybeSingle();

      if (profErr) {
        return NextResponse.json({ ok: false, error: "profile_query_failed", detail: profErr.message }, { status: 500 });
      }
      if (!profile) {
        return NextResponse.json({ ok: false, error: "profile_not_found" }, { status: 403 });
      }

      // Ownership: pipeline_runs.created_by must equal profiles.id
      const { data: runRow, error: runErr } = await supabase
        .from("pipeline_runs")
        .select("id, created_by, status")
        .eq("id", pipelineRunId)
        .maybeSingle();

      if (runErr) return NextResponse.json({ ok: false, error: "run_query_failed", detail: runErr.message }, { status: 500 });
      if (!runRow) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

      if (runRow.created_by !== profile.id) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } else {
      // internal call: ensure run exists
      const { data: runCheck, error: runErr } = await supabase
        .from("pipeline_runs")
        .select("id")
        .eq("id", pipelineRunId)
        .maybeSingle();
      if (runErr) return NextResponse.json({ ok: false, error: "run_query_failed", detail: runErr.message }, { status: 500 });
      if (!runCheck) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Fetch module run
    const { data: mod, error: modErr } = await supabase
      .from("module_runs")
      .select("id, module_index, module_name, status, output_ref")
      .eq("pipeline_run_id", pipelineRunId)
      .eq("module_index", idx)
      .maybeSingle();

    if (modErr) return NextResponse.json({ ok: false, error: "module_query_failed", detail: modErr.message }, { status: 500 });
    if (!mod) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    if (!mod.output_ref) {
      return NextResponse.json({ ok: false, error: "output_not_ready", status: mod.status }, { status: 409 });
    }

    const bucket = process.env.PIPELINE_OUTPUTS_BUCKET || "pipeline-outputs";
    const { data, error: dlErr } = await supabase.storage.from(bucket).download(mod.output_ref);

    if (dlErr || !data) {
      return NextResponse.json(
        { ok: false, error: "output_download_failed", detail: String(dlErr?.message ?? dlErr ?? "unknown"), bucket, output_ref: mod.output_ref },
        { status: 500 }
      );
    }

    const text = await data.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(
        {
          ok: true,
          pipelineRunId,
          module: { index: mod.module_index, name: mod.module_name, status: mod.status },
          output_ref: mod.output_ref,
          output: json,
        },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        {
          ok: true,
          pipelineRunId,
          module: { index: mod.module_index, name: mod.module_name, status: mod.status },
          output_ref: mod.output_ref,
          error: "output_not_json",
          raw: text,
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
