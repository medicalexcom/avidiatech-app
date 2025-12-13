import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

const MODULES = ["extract", "seo", "audit", "import", "monitor", "price"] as const;

function clerkUserIdToUuid(clerkUserId: string): string {
  // Deterministic UUID derived from Clerk userId (fits uuid column).
  // uuid-ish formatting: xxxxxxxx-xxxx-5xxx-8xxx-xxxxxxxxxxxx
  const hash = crypto.createHash("sha1").update(`clerk:${clerkUserId}`).digest("hex");
  const a = hash.slice(0, 8);
  const b = hash.slice(8, 12);
  const c = ((parseInt(hash.slice(12, 16), 16) & 0x0fff) | 0x5000).toString(16).padStart(4, "0"); // v5
  const d = ((parseInt(hash.slice(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, "0"); // variant
  const e = hash.slice(20, 32);
  return `${a}-${b}-${c}-${d}-${e}`;
}

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // Lazy import so build doesn’t fail if supabase-js isn’t evaluated in some contexts.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase_not_configured", message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const requestId = crypto.randomUUID();
  const createdBy = clerkUserIdToUuid(userId);

  const { data: run, error: runErr } = await supabase
    .from("pipeline_runs")
    .insert([{ status: "queued", created_by: createdBy, metadata: { requestId, payload } }])
    .select("*")
    .single();

  if (runErr || !run) {
    return NextResponse.json(
      { error: "pipeline_run_insert_failed", details: String(runErr?.message ?? runErr) },
      { status: 500 }
    );
  }

  const pipelineRunId = run.id as string;

  const moduleRows = MODULES.map((module_name, module_index) => ({
    pipeline_run_id: pipelineRunId,
    module_name,
    module_index,
    status: "queued",
  }));

  const { error: modErr } = await supabase.from("module_runs").insert(moduleRows);
  if (modErr) {
    return NextResponse.json(
      { error: "module_runs_insert_failed", details: String(modErr?.message ?? modErr) },
      { status: 500 }
    );
  }

  // Trigger edge function runner (service role auth; server-side only)
  const fnName = process.env.PIPELINE_RUNNER_FUNCTION_NAME || "pipeline-runner";
  const fnUrl = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/functions/v1/${fnName}`;

  try {
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ pipelineRunId }),
    });

    // Don’t fail the request if runner fails to start; return 202 with warning
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return NextResponse.json(
        { pipelineRunId, warning: "runner_invocation_failed", status: resp.status, body },
        { status: 202 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { pipelineRunId, warning: "runner_invocation_error", details: String(e?.message ?? e) },
      { status: 202 }
    );
  }

  return NextResponse.json({ pipelineRunId }, { status: 202 });
}
