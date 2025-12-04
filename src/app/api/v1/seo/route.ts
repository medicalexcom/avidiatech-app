import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

/**
 * Given the normalized_payload from the ingest engine, produce:
 * - seo_payload: object with SEO fields (from CENTRAL_GPT or engine)
 * - description_html: HTML string
 * - features: optional features array
 */
async function callSeoModel(normalizedPayload: any, correlationId?: string) {
  if (!CENTRAL_GPT_URL || !CENTRAL_GPT_KEY) {
    console.warn(
      "[api/v1/seo] CENTRAL_GPT_URL/CENTRAL_GPT_KEY not set; returning normalizedPayload-derived SEO output"
    );

    // Engine-first mapping:
    // Your normalized_payload currently looks like:
    // {
    //   seo: {
    //     h1, title, metaTitle, pageTitle, metaDescription, seoShortDescription
    //   },
    //   description_html: "<p>...</p>",
    //   features: [ ... ],
    //   source_url: "...",
    //   normalizedPayload: { name, brand, specs, format }
    // }
    const engineSeo = normalizedPayload?.seo ?? normalizedPayload ?? {};

    const descriptionHtml =
      normalizedPayload?.description_html ??
      normalizedPayload?.descriptionHtml ??
      "";

    const features =
      Array.isArray(normalizedPayload?.features) &&
      normalizedPayload.features.length > 0
        ? normalizedPayload.features
        : null;

    return {
      seo_payload: {
        ...engineSeo,
        __source: "engine_normalized_payload",
        source_url: normalizedPayload?.source_url ?? null,
        normalized_name: normalizedPayload?.normalizedPayload?.name ?? null,
        format: normalizedPayload?.normalizedPayload?.format ?? "avidia_standard",
      },
      description_html: descriptionHtml,
      features,
    };
  }

  const body = {
    module: "seo",
    payload: normalizedPayload,
    correlation_id: correlationId || undefined,
  };

  const res = await fetch(CENTRAL_GPT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${CENTRAL_GPT_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore; we'll surface raw body below
  }

  if (!res.ok) {
    throw new Error(
      `central GPT seo error: ${res.status} ${
        json ? JSON.stringify(json) : text
      }`
    );
  }

  // Expected structure from CENTRAL_GPT:
  // {
  //   seo: { title, meta_title, meta_description, h1, ... },
  //   description_html: "<p>...</p>",
  //   features: [ "..." ]
  // }
  const seoPayload = json?.seo ?? json ?? normalizedPayload;
  const descriptionHtml =
    json?.description_html ??
    json?.description ??
    normalizedPayload?.description_html ??
    "";
  const features = json?.features ?? normalizedPayload?.features ?? null;

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    features,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } =
      ((safeGetAuth(req as any) as { userId?: string | null }) as {
        userId?: string | null;
      }) || {};

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const ingestionId = body?.ingestionId?.toString() || "";
    if (!ingestionId) {
      return NextResponse.json(
        { error: "missing_ingestionId" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Load ingestion row
    const { data: ingestion, error: loadErr } = await supabase
      .from("product_ingestions")
      .select(
        "id, tenant_id, user_id, normalized_payload, seo_payload, description_html, features, correlation_id, diagnostics, status"
      )
      .eq("id", ingestionId)
      .maybeSingle();

    if (loadErr) {
      console.error(
        "[api/v1/seo] failed to load product_ingestions",
        loadErr.message || loadErr
      );
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    if (!ingestion) {
      return NextResponse.json(
        { error: "ingestion_not_found" },
        { status: 404 }
      );
    }

    // (Optional) tenant/user guard: only owner of ingestion can run SEO
    if (ingestion.user_id && ingestion.user_id !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!ingestion.normalized_payload) {
      // Ingest engine hasn't filled normalized_payload yet
      return NextResponse.json(
        { error: "ingestion_not_ready" },
        { status: 409 }
      );
    }

    const normalized = ingestion.normalized_payload as any;
    const startedAt = new Date().toISOString();

    let seoResult: {
      seo_payload: any;
      description_html: string;
      features: any;
    };

    try {
      seoResult = await callSeoModel(
        normalized,
        ingestion.correlation_id || undefined
      );
    } catch (err: any) {
      console.error("[api/v1/seo] seo model error:", err?.message || err);

      const existingDiagnostics = (ingestion.diagnostics as any) || {};
      const updatedDiagnostics = {
        ...existingDiagnostics,
        seo_call: {
          ...(existingDiagnostics.seo_call || {}),
          last_error: String(err?.message || err),
          last_error_at: new Date().toISOString(),
          last_started_at: startedAt,
        },
      };

      await supabase
        .from("product_ingestions")
        .update({
          diagnostics: updatedDiagnostics,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestion.id);

      return NextResponse.json(
        { error: "seo_generation_failed" },
        { status: 500 }
      );
    }

    const existingDiagnostics = (ingestion.diagnostics as any) || {};
    const updatedDiagnostics = {
      ...existingDiagnostics,
      seo_call: {
        ...(existingDiagnostics.seo_call || {}),
        last_success_at: new Date().toISOString(),
        last_started_at: startedAt,
      },
    };

    const nowIso = new Date().toISOString();

    // IMPORTANT: we now *finalize* the ingestion if it was stuck in "processing"
    // We never flip back to "pending"; we only upgrade "processing" -> "completed".
    const nextStatus =
      ingestion.status === "processing" ? "completed" : ingestion.status;

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update({
        seo_payload: seoResult.seo_payload,
        description_html: seoResult.description_html,
        features: seoResult.features,
        seo_generated_at: nowIso,
        diagnostics: updatedDiagnostics,
        status: nextStatus,
        updated_at: nowIso,
      })
      .eq("id", ingestion.id);

    if (updErr) {
      console.error(
        "[api/v1/seo] failed to update product_ingestions with seo",
        updErr.message || updErr
      );
      return NextResponse.json(
        { error: "db_update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ingestionId: ingestion.id,
        seo_payload: seoResult.seo_payload,
        description_html: seoResult.description_html,
        features: seoResult.features,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/seo error:", err);
    return NextResponse.json(
      { error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}
