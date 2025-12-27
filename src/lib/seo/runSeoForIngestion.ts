import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * Strict SEO runner.
 *
 * Rules:
 * - Requires product_ingestions.normalized_payload (no artifact fallback).
 * - Requires OpenAI strict schema output (callSeoModel throws otherwise).
 * - Persists only after strict validation passes.
 *
 * Canonical return keys (Describe-style):
 * - descriptionHtml
 * - sections
 * - seo
 * - features
 * - data_gaps
 */
export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;

  // canonical
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];

  // legacy aliases for DB / old clients
  seo_payload: any;
  description_html: string;
}> {
  const supabase = getServiceSupabaseClient();

  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select("id, tenant_id, source_url, normalized_payload, correlation_id, diagnostics")
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  if (!ingestion) throw new Error("ingestion_not_found");

  const normalized = (ingestion as any).normalized_payload;
  if (!normalized) {
    // Strict requirement: no fallback
    throw new Error("missing_required_ingestion_payload");
  }

  const startedAt = new Date().toISOString();

  const seoResult = await callSeoModel(
    normalized,
    (ingestion as any).correlation_id || null,
    (ingestion as any).source_url || null,
    (ingestion as any).tenant_id || null
  );

  const finishedAt = new Date().toISOString();

  // Persist: DB uses snake_case columns; keep them stable
  const diagnostics = (ingestion as any).diagnostics || {};
  const updatedDiagnostics = {
    ...diagnostics,
    seo: {
      ...(diagnostics.seo || {}),
      status: "completed",
      started_at: startedAt,
      last_run_at: finishedAt,
      // keep a small snapshot for debugging (non-sensitive)
      model: seoResult?._meta?.model ?? null,
      instruction_source: seoResult?._meta?.instructionsSource ?? null,
      data_gaps: seoResult.data_gaps ?? [],
    },
  };

  const { data: updated, error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      seo_payload: seoResult.seo,
      description_html: seoResult.descriptionHtml,
      features: seoResult.features,
      seo_generated_at: finishedAt,
      diagnostics: updatedDiagnostics,
      updated_at: finishedAt,
    })
    .eq("id", ingestionId)
    .select("id, seo_payload, description_html, features")
    .maybeSingle();

  if (updErr) throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);

  const seo = updated?.seo_payload ?? seoResult.seo;
  const descriptionHtml = updated?.description_html ?? seoResult.descriptionHtml;
  const features = (updated?.features as any) ?? seoResult.features;

  return {
    ingestionId,
    descriptionHtml,
    sections: seoResult.sections,
    seo,
    features,
    data_gaps: seoResult.data_gaps,

    // legacy aliases
    seo_payload: seo,
    description_html: descriptionHtml,
  };
}
