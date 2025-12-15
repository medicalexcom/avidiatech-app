import { NextResponse } from "next/server";

/**
 * Retry a pipeline run - MVP stub.
 * - In a full implementation, this would enqueue a job that re-runs the pipeline or a subset.
 * - For now, returns that the retry was queued (TODO).
 */

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const runId = params.id;
    if (!runId) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    // TODO: enqueue actual retry job in worker/queue
    return NextResponse.json({ ok: true, message: "Retry requested (MVP). Implement background retry worker.", retryRequestedFor: runId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
