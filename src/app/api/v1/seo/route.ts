import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

/**
 * Call the central GPT / custom_gpt_instructions engine to generate SEO
 * for a given normalized ingestion payload.
 *
 * If CENTRAL_GPT is not configured or returns an error, we fail loudly
 * so you see it in Vercel logs / UI instead of silently shipping stub SEO.
 */
async function callSeoModel(
  normalizedPayload: any,
  correlationId?: string,
  sourceUrl?: string
): Promise<{
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
}> {
  if (!CENTRAL_GPT_URL || !CENTRAL_GPT_KEY) {
    throw new Error(
      "central_gpt_not_configured: CENTRAL_GPT_URL / CENTRAL_GPT_KEY missing"
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

  if (!res.ok) {
    console.error(
      "[api/v1/seo] central GPT responded with non-200",
      res.status,
      text
    );
    throw new Error(
      `central_gpt_seo_error: ${res.status} ${text || "(empty body)"}`
    );
  }

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (err: any) {
    console.error(
      "[api/v1/seo] central GPT returned non-JSON body",
      err?.message || err,
      "raw=",
      text.slice(0, 500)
    );
    throw new Error("central_gpt_invalid_json");
  }

  // Normalize the shape from central-gpt
  const normalized = normalizedPayload || {};
  const seoPayload = json?.seo || normalized?.seo || {};
  const descriptionHtml =
    json?.description_html ||
    json?.description ||
    normalized?.description_html ||
    null;
  const features = Array.isArray(json?.features)
    ? json.features
    : normalized?.features ?? null;

  // Tiny debug log so we can see that something came back
  console.log("[api/v1/seo] central GPT SEO summary", {
    hasSeo: !!seoPayload,
    hasDescription: !!descriptionHtml,
    featuresCount: Array.isArray(features) ? features.length : null,
    sourceUrl: sourceUrl || null,
  });

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    features,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth via Clerk
    const { userId } =
      ((safeGetAuth(req as any) as { userId?: string | null }) as {
        userId?: string | null;
      }) || {};

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // 2) Grab ingestionId from JSON body
    const body = (await req.json().catch(() => ({}))) as any;
    const ingestionId = body?.ingestionId?.toString() || "";
    if (!ingestionId) {
      return NextResponse.json(
        { error: "missing_ingestionId" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // 3) Load ingestion row
    const { data: ingestion, error: loadErr } = await supabase
      .from("product_ingestions")
      .select(
        "id, tenant_id, user_id, source_url, normalized_payload, seo_payload, description_html, features, correlation_id, diagnostics, status"
      )
      .eq("id", ingestionId)
      .maybeSingle();

    if (loadErr) {
      console.error("[api/v1/seo] failed to load ingestion", {
        ingestionId,
        error: loadErr,
      });
      return NextResponse.json(
        { error: "ingestion_load_failed" },
        { status: 500 }
      );
    }

    if (!ingestion) {
      return NextResponse.json(
        { error: "ingestion_not_found" },
        { status: 404 }
      );
    }

    // Optionally ensure the ingestion belongs to this user.
    // If you want strict ownership, uncomment this:
    // if (ingestion.user_id && ingestion.user_id !== userId) {
    //   return NextResponse.json(
    //     { error: "forbidden_ingestion" },
    //     { status: 403 }
    //   );
    // }

    if (!ingestion.normalized_payload) {
      return NextResponse.json(
        { error: "ingestion_not_ready" },
        { status: 409 }
      );
    }

    const normalized = ingestion.normalized_payload as any;
    const startedAt = new Date().toISOString();

    // 4) Call central GPT SEO engine
    let seoResult: {
      seo_payload: any;
      description_html: string | null;
      features: string[] | null;
    };

    try {
      seoResult = await callSeoModel(
        normalized,
        ingestion.correlation_id || undefined,
        ingestion.source_url || undefined
      );
    } catch (err: any) {
      console.error("[api/v1/seo] seo model error:", err?.message || err);
      return NextResponse.json(
        {
          error: "seo_model_failed",
          detail: err?.message || String(err),
        },
        { status: 500 }
      );
    }

    const finishedAt = new Date().toISOString();

    // 5) Merge diagnostics
    const diagnostics = ingestion.diagnostics || {};
    const seoDiagnostics = {
      ...(diagnostics.seo || {}),
      last_run_at: finishedAt,
      started_at: startedAt,
      status: "completed",
    };

    const updatedDiagnostics = {
      ...diagnostics,
      seo: seoDiagnostics,
    };

    // 6) Persist SEO into product_ingestions
    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update({
        seo_payload: seoResult.seo_payload,
        description_html: seoResult.description_html,
        features: seoResult.features,
        seo_generated_at: finishedAt,
        diagnostics: updatedDiagnostics,
        updated_at: finishedAt,
      })
      .eq("id", ingestion.id);

    if (updErr) {
      console.error("[api/v1/seo] failed to update ingestion with SEO", {
        ingestionId: ingestion.id,
        error: updErr,
      });
      return NextResponse.json(
        { error: "seo_persist_failed" },
        { status: 500 }
      );
    }

    // 7) Return SEO payload to the dashboard
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
