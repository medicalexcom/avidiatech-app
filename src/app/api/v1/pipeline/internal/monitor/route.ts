import { NextResponse } from "next/server";
import { createWatchForIngestion } from "@/lib/monitor/hooks";

export const runtime = "nodejs";

/**
 * POST /api/v1/pipeline/internal/monitor
 *
 * Runs monitor for an ingestionId by ensuring a watch exists and doing an initial check.
 * Must be called by pipeline-runner with x-pipeline-secret.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";
  const sourceUrl = body?.sourceUrl?.toString() || "";

  if (!ingestionId) {
    return NextResponse.json({ ok: false, error: "missing_ingestionId" }, { status: 400 });
  }

  if (!sourceUrl) {
    // We can still succeed "softly" (don’t fail pipeline if URL missing)
    return NextResponse.json(
      { ok: true, skipped: true, reason: "missing_sourceUrl" },
      { status: 200 }
    );
  }

  try {
    // tenant_id/created_by can be unknown in pipeline context; best-effort only
    const watch = await createWatchForIngestion({
      source_url: sourceUrl,
      product_id: ingestionId,
      tenant_id: body?.tenant_id ?? null,
      created_by: body?.created_by ?? null,
      frequency_seconds: null,
      run_initial_check: true, // this triggers runWatchOnce non-blocking
    });

    return NextResponse.json(
      { ok: true, watch_id: watch?.id ?? null, watch_last_status: watch?.last_status ?? null },
      { status: 200 }
    );
  } catch (err: any) {
    // IMPORTANT: do not throw; return structured error so pipeline-runner can decide fail/skip
    return NextResponse.json(
      { ok: false, error: "monitor_internal_failed", detail: String(err?.message ?? err) },
      { status: 200 }
    );
  }
}
