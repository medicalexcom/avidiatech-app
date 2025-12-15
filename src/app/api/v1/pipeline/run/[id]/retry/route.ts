import { NextResponse } from "next/server";

/**
 * Retry a pipeline run - MVP stub.
 * - Normalizes context.params because Next's context.params can be a Promise in some Next versions.
 * - In a full implementation, this would enqueue a job that re-runs the pipeline or a subset.
 * - For now, returns that the retry was queued (TODO: hook into a real background worker).
 */

export async function POST(req: Request, context: any) {
  try {
    // Normalize params (context.params may be a Promise)
    let params = context?.params;
    if (params && typeof params?.then === "function") {
      params = await params;
    }
    const runId = params?.id;
    if (!runId) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    // TODO: enqueue actual retry job in a worker/queue (BullMQ, Supabase task, etc).
    // For now return a helpful response indicating the retry request was received.
    return NextResponse.json({
      ok: true,
      message: "Retry requested (MVP). Implement background retry worker to perform actual retry.",
      retryRequestedFor: runId,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
