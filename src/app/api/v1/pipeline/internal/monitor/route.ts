import { NextResponse } from "next/server";
import { createWatchForIngestion } from "@/lib/monitor/hooks";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/v1/pipeline/internal/monitor
 *
 * Creates/links a monitor watch for the ingestion's source_url and runs an initial check.
 * Returns ok:true even if monitor check fails (so pipeline can still succeed),
 * but includes details so output artifact shows what happened.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";

  if (!ingestionId) {
    return NextResponse.json({ ok: false, error: "missing_ingestionId" }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabaseClient();

    // Load ingestion so we can find the canonical URL + tenant context
    const { data: ing, error: ingErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, created_by, source_url")
      .eq("id", ingestionId)
      .maybeSingle();

    if (ingErr) {
      return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: ingErr.message }, { status: 200 });
    }
    if (!ing) {
      return NextResponse.json({ ok: false, error: "ingestion_not_found" }, { status: 200 });
    }

    const sourceUrl = String((ing as any).source_url || "").trim();
    if (!sourceUrl) {
      return NextResponse.json({ ok: true, skipped: true, reason: "missing_source_url" }, { status: 200 });
    }

    // create watch + trigger initial check (best-effort)
    const watch = await createWatchForIngestion({
      source_url: sourceUrl,
      product_id: ingestionId,
      tenant_id: (ing as any).tenant_id ?? null,
      created_by: (ing as any).created_by ?? null,
      frequency_seconds: null,
      run_initial_check: true,
    });

    // return structured result (do not throw)
    return NextResponse.json(
      {
        ok: true,
        ingestionId,
        source_url: sourceUrl,
        watch: watch ? { id: watch.id, last_status: watch.last_status ?? null } : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    // IMPORTANT: do not fail hard; return ok:false in body but HTTP 200 so runner can mark module succeeded-with-warning if desired
    return NextResponse.json(
      { ok: false, error: "monitor_internal_exception", detail: String(e?.message ?? e) },
      { status: 200 }
    );
  }
}
