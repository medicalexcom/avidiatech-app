import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

/**
 * Call the central GPT / custom_gpt_instructions engine to generate SEO
 * for a given normalized ingestion payload.
 *
 * We no longer silently fall back to normalizedPayload. If CENTRAL_GPT
 * is not configured or returns an error, we fail loudly so you notice
 * and fix config instead of shipping stub SEO.
 */
async function callSeoModel(normalizedPayload: any, correlationId?: string) {
  if (!CENTRAL_GPT_URL || !CENTRAL_GPT_KEY) {
    throw new Error(
      "central_gpt_not_configured: CENTRAL_GPT_URL/CENTRAL_GPT_KEY must be set for AvidiaSEO to use custom_gpt_instructions."
    );
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
    // leave json = null, we'll surface raw text in error if needed
  }

  if (!res.ok) {
    throw new Error(
      `central_gpt_seo_error: ${res.status} ${
        json ? JSON.stringify(json) : text
      }`
    );
  }

  // Expected structure from central GPT:
  // {
  //   seo: { h1, pageTitle, metaDescription, seoShortDescription, ... },
  //   description_html: "<p>...</p>",
  //   features: [ "..." ],
  //   normalizedPayload?: {...}
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
      return NextResponse.json(
        { error: "db_error" },
        { status: 500 }
      );
    }

    if (!ingestion) {
      return NextResponse.json(
        { error: "ingestion_not_found" },
        { status: 404 }
      );
    }

    // (Optional) tenant/user guard: only owner of ingestion can run SEO
    if (ingestion.user_id && ingestion.user_id !== userId) {
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403 }
      );
    }

    if (!ingestion.normalized_payload) {
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

      // Surface a specific error if central GPT isn't configured
      if (
        typeof err?.message === "string" &&
        err.message.startsWith("central_gpt_not_configured")
      ) {
        return NextResponse.json(
          { error: "central_gpt_not_configured" },
          { status: 500 }
        );
      }

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

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update({
        seo_payload: seoResult.seo_payload,
        description_html: seoResult.description_html,
        features: seoResult.features,
        seo_generated_at: new Date().toISOString(),
        diagnostics: updatedDiagnostics,
        updated_at: new Date().toISOString(),
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
