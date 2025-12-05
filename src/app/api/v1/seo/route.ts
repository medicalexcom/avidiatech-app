// src/app/api/v1/seo/route.ts

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

async function callSeoModel(
  normalizedPayload: any,
  correlationId?: string | null,
  sourceUrl?: string | null,
  tenantId?: string | null
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

  const { text: instructions, source: instructionsSource } =
    await loadCustomGptInstructionsWithInfo(tenantId ?? null);

  const defaultBuildSeoRequestBody = ({
    module = "seo",
    payload,
    correlationId,
    customInstructions,
    instructionsSource,
  }: {
    module?: string;
    payload: any;
    correlationId?: string | null;
    customInstructions?: string | null;
    instructionsSource?: string | null;
  }) => {
    const trimmedInstructions =
      typeof customInstructions === "string" ? customInstructions.trim() : "";

    return {
      module,
      payload,
      correlation_id: correlationId || undefined,
      custom_gpt_instructions:
        trimmedInstructions.length > 0 ? trimmedInstructions : undefined,
      instruction_source: instructionsSource || undefined,
      enforce_instructions: trimmedInstructions.length > 0,
      audit: { format: "avidia_seo_v1" },
    };
  };

  let buildSeoRequestBody: ((opts: any) => any) | null = defaultBuildSeoRequestBody;
  try {
    const enforcerPath = path.join(
      process.cwd(),
      "../medx-ingest-api/tools/render-engine/gptInstructionsEnforcer.mjs"
    );
    if (fs.existsSync(enforcerPath)) {
      const enforcerModulePath = pathToFileURL(enforcerPath).toString();
      const enforcerModule = await import(enforcerModulePath);
      buildSeoRequestBody =
        (enforcerModule as any).buildSeoRequestBody ||
        (enforcerModule as any).default?.buildSeoRequestBody ||
        buildSeoRequestBody;
      console.log("[api/v1/seo] using shared gptInstructionsEnforcer module");
    } else {
      console.log(
        "[api/v1/seo] shared gptInstructionsEnforcer not present; using built-in body builder"
      );
    }
  } catch (err: any) {
    console.warn(
      "[api/v1/seo] unable to load shared gptInstructionsEnforcer",
      err?.message || err
    );
  }

  const body = buildSeoRequestBody
    ? buildSeoRequestBody({
        module: "seo",
        payload: normalizedPayload,
        correlationId: correlationId || undefined,
        customInstructions: instructions,
        instructionsSource,
      })
    : {
        module: "seo",
        payload: normalizedPayload,
        correlation_id: correlationId || undefined,
        custom_gpt_instructions: instructions || undefined,
        instruction_source: instructionsSource || undefined,
        enforce_instructions: Boolean(instructions),
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
      "[api/v1/seo] central GPT non-200",
      res.status,
      text?.slice(0, 500)
    );
    throw new Error(
      `central_gpt_seo_error: ${res.status} ${text || "(empty body)"}`
    );
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (err: any) {
    console.error(
      "[api/v1/seo] central GPT returned non-JSON",
      err?.message || err,
      "raw=",
      text?.slice(0, 500)
    );
    throw new Error("central_gpt_invalid_json");
  }

  const normalized = normalizedPayload || {};
  const seoPayload =
    json?.seo ||
    json?.seo_payload ||
    normalized?.seo_payload ||
    normalized?.seo ||
    {};
  const descriptionHtml =
    json?.description_html ||
    json?.description ||
    json?.seo?.description_html ||
    json?.seo_payload?.description_html ||
    normalized?.description_html ||
    normalized?.seo_payload?.description_html ||
    null;
  const features = Array.isArray(json?.features)
    ? json.features
    : Array.isArray(json?.seo?.features)
      ? json.seo.features
      : Array.isArray(json?.seo_payload?.features)
        ? json.seo_payload.features
        : Array.isArray(normalized?.features)
          ? normalized.features
          : Array.isArray(normalized?.seo_payload?.features)
            ? normalized.seo_payload.features
            : null;

  console.log("[api/v1/seo] central GPT SEO summary", {
    hasSeo: !!seoPayload,
    hasDescription: !!descriptionHtml,
    featuresCount: Array.isArray(features) ? features.length : null,
    sourceUrl: sourceUrl || null,
    instructionsSource: instructionsSource || null,
  });

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    features,
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log("[api/v1/seo] POST called");
    // 1) Auth (Clerk)
    const auth = safeGetAuth(req as any) as { userId?: string | null } | null;
    const userId = auth?.userId ?? null;

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // 2) Parse body
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

    if (!ingestion.normalized_payload) {
      return NextResponse.json(
        { error: "ingestion_not_ready" },
        { status: 409 }
      );
    }

    const normalized = ingestion.normalized_payload as any;
    const startedAt = new Date().toISOString();

    // 4) Call central GPT
    let seoResult;
    try {
      seoResult = await callSeoModel(
        normalized,
        ingestion.correlation_id || null,
        ingestion.source_url || null,
        ingestion.tenant_id || null
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
    const { data: updatedRows, error: updErr } = await supabase
      .from("product_ingestions")
      .update({
        seo_payload: seoResult.seo_payload,
        description_html: seoResult.description_html,
        features: seoResult.features,
        seo_generated_at: finishedAt,
        diagnostics: updatedDiagnostics,
        updated_at: finishedAt,
      })
      .eq("id", ingestion.id)
      .select("id, seo_payload, description_html, features")
      .maybeSingle();

    if (updErr) {
      console.error("[api/v1/seo] failed to update ingestion with SEO", {
        ingestionId: ingestion.id,
        error: updErr,
      });
      return NextResponse.json(
        { error: "seo_persist_failed", detail: updErr.message || updErr },
        { status: 500 }
      );
    }

    console.log("[api/v1/seo] SEO persisted", {
      ingestionId: ingestion.id,
      hasSeo: !!updatedRows?.seo_payload,
      hasDescription: !!updatedRows?.description_html,
      featuresCount: Array.isArray(updatedRows?.features)
        ? updatedRows?.features.length
        : null,
    });

    // 7) Return SEO to frontend
    return NextResponse.json(
      {
        ingestionId: ingestion.id,
        seo_payload: updatedRows?.seo_payload ?? seoResult.seo_payload,
        description_html:
          updatedRows?.description_html ?? seoResult.description_html,
        features: updatedRows?.features ?? seoResult.features,
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
