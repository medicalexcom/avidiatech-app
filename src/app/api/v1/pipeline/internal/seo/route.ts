import { NextResponse } from "next/server";
import { runSeoForIngestion } from "@/lib/seo/runSeoForIngestion";

/**
 * POST /api/v1/pipeline/internal/seo
 *
 * Internal pipeline endpoint (service-to-service).
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";

  if (!ingestionId) {
    return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });
  }

  try {
    const result: any = await runSeoForIngestion(ingestionId);

    return NextResponse.json(
      {
        ok: true,
        ingestionId: result.ingestionId,

        // canonical
        seo: result.seo,
        descriptionHtml: result.descriptionHtml,
        sections: result.sections ?? null,
        features: result.features ?? [],
        data_gaps: result.data_gaps ?? [],
        _meta: result._meta ?? null,

        // legacy aliases
        seo_payload: result.seo,
        description_html: result.descriptionHtml,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg = err?.message || String(err);

    // Include stack in non-prod if available (helps pipeline debugging)
    const stack =
      process.env.NODE_ENV === "production" ? null : err?.stack || null;

    if (msg === "ingestion_not_found")
      return NextResponse.json({ ok: false, error: "ingestion_not_found", stack }, { status: 404 });

    // IMPORTANT: treat prefixed ingestion_not_ready messages as 409 too
    if (msg === "ingestion_not_ready" || msg.startsWith("ingestion_not_ready:")) {
      return NextResponse.json({ ok: false, error: "ingestion_not_ready", detail: msg, stack }, { status: 409 });
    }

    if (msg.startsWith("ingestion_load_failed:"))
      return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: msg, stack }, { status: 500 });

    if (
      msg === "central_gpt_invalid_json" ||
      msg.startsWith("central_gpt_not_configured:") ||
      msg.startsWith("central_gpt_seo_error:")
    ) {
      return NextResponse.json({ ok: false, error: "seo_model_failed", detail: msg, stack }, { status: 500 });
    }

    if (msg.startsWith("seo_persist_failed:")) {
      return NextResponse.json({ ok: false, error: "seo_persist_failed", detail: msg, stack }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: "seo_internal_failed", detail: msg, stack }, { status: 500 });
  }
}
