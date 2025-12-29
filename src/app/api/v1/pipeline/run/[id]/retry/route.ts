import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";
import { getQueue } from "@/lib/queue/bull";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * POST /api/v1/pipeline/run/:id/retry
 * Admin only. Enqueues a pipeline-retry job with the pipeline run id.
 * Returns the new queued job id for tracking.
 */
export async function POST(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    await throwIfNotAdmin(req, orgId);

    const { id: pipelineRunId } = context?.params ?? {};
    if (!pipelineRunId) return NextResponse.json({ ok: false, error: "pipelineRunId required" }, { status: 400 });

    // verify pipeline run belongs to org
    const { data: runRow, error: runErr } = await supaAdmin.from("pipeline_runs").select("*").eq("id", pipelineRunId).single();
    if (runErr) throw runErr;
    if (!runRow || runRow.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    const queue = getQueue("pipeline-retry");
    const job = await queue.add("pipeline-retry", { pipelineRunId }, { attempts: 3 });

    // optionally record audit / retry request in DB (simple insert)
    await supaAdmin.from("pipeline_runs").update({ status: "retry_requested", updated_at: new Date().toISOString() }).eq("id", pipelineRunId);

    return NextResponse.json({ ok: true, queuedJobId: job.id });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
