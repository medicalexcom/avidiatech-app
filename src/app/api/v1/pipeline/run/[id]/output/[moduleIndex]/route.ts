import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Pipeline output fetch endpoint
 *
 * Behavior:
 * - If request includes valid x-pipeline-secret === process.env.PIPELINE_INTERNAL_SECRET,
 *   the route allows the request without Clerk session (service-to-service).
 * - Otherwise, it requires a Clerk-authenticated user and enforces ownership (run.created_by).
 *
 * Returns:
 * {
 *   pipelineRunId: string,
 *   module: { index, name, status },
 *   output_ref: string,
 *   output: any
 * }
 */

function clerkUserIdToUuid(clerkUserId: string): string {
  const hash = crypto.createHash("sha1").update(`clerk:${clerkUserId}`).digest("hex");
  const a = hash.slice(0, 8);
  const b = hash.slice(8, 12);
  const c = ((parseInt(hash.slice(12, 16), 16) & 0x0fff) | 0x5000).toString(16).padStart(4, "0");
  const d = ((parseInt(hash.slice(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  const e = hash.slice(20, 32);
  return `${a}-${b}-${c}-${d}-${e}`;
}

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; moduleIndex: string }> }
) {
  // If caller provided the internal secret, allow service access without Clerk session.
  const req = _req as Request;
  const providedSecret = (req.headers.get("x-pipeline-secret") || "").toString();
  const expectedSecret = process.env.PIPELINE_INTERNAL_SECRET || "";
  const isInternalCall = Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);

  let clerkUserId: string | null = null;
  if (!isInternalCall) {
    // Enforce Clerk auth for user requests
    const a = await auth();
    clerkUserId = a.userId ?? null;
    if (!clerkUserId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
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

  // Verify ownership on pipeline run for non-internal callers
  if (!isInternalCall) {
    const createdBy = clerkUserIdToUuid(clerkUserId as string);
    const { data: run, error: runErr } = await supabase
      .from("pipeline_runs")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();

    if (runErr) {
      return NextResponse.json({ error: "run_query_failed", details: String(runErr?.message ?? runErr) }, { status: 500 });
    }
    if (!run || run.created_by !== createdBy) {
      // keep 404 to avoid leaking existence
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } else {
    // For internal calls we still want to ensure the run exists (no ownership check)
    const { data: runCheck, error: runErr } = await supabase.from("pipeline_runs").select("id").eq("id", id).maybeSingle();
    if (runErr) {
      return NextResponse.json({ error: "run_query_failed", details: String(runErr?.message ?? runErr) }, { status: 500 });
    }
    if (!runCheck) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  // Find module run
  const { data: mod, error: modErr } = await supabase
    .from("module_runs")
    .select("id, module_index, module_name, status, output_ref")
    .eq("pipeline_run_id", id)
    .eq("module_index", idx)
    .maybeSingle();

  if (modErr) {
    return NextResponse.json(
      { error: "module_query_failed", details: String(modErr?.message ?? modErr) },
      { status: 500 }
    );
  }
  if (!mod) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!mod.output_ref) {
    return NextResponse.json(
      { error: "output_not_ready", status: mod.status, message: "Module has no output_ref yet." },
      { status: 409 }
    );
  }

  // Download from Storage
  const bucket = process.env.PIPELINE_OUTPUTS_BUCKET || "pipeline-outputs";
  const { data, error: dlErr } = await supabase.storage.from(bucket).download(mod.output_ref);

  if (dlErr || !data) {
    return NextResponse.json(
      { error: "output_download_failed", details: String(dlErr?.message ?? dlErr), output_ref: mod.output_ref },
      { status: 500 }
    );
  }

  // Parse JSON
  const text = await data.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json(
      {
        error: "output_not_json",
        output_ref: mod.output_ref,
        module: { index: mod.module_index, name: mod.module_name },
        raw: text,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      pipelineRunId: id,
      module: { index: mod.module_index, name: mod.module_name, status: mod.status },
      output_ref: mod.output_ref,
      output: json,
    },
    { status: 200 }
  );
}
