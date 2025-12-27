import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * Strict SEO run:
 * - Requires product_ingestions.normalized_payload to exist
 * - No artifact fallback, no dummy, no permissive merging
 */
export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;

  // canonical
  seo: any;
  descriptionHtml: string;
  features: string[];

  // legacy aliases (optional)
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

  const result = await callSeoModel(
    normalized,
    (ingestion as any).correlation_id || null,
    (ingestion as any).source_url || null,
    (ingestion as any).tenant_id || null
  );

  const finishedAt = new Date().toISOString();

  const diagnostics = (ingestion as any).diagnostics || {};
  const updatedDiagnostics = {
    ...diagnostics,
    seo: {
      ...(diagnostics.seo || {}),
      status: "completed",
      started_at: startedAt,
      last_run_at: finishedAt,
    },
  };

  // Persist only after strict validation succeeded (callSeoModel would throw otherwise)
  const { data: updated, error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      seo_payload: result.seo,
      description_html: result.descriptionHtml,
      features: result.features,
      seo_generated_at: finishedAt,
      diagnostics: updatedDiagnostics,
      updated_at: finishedAt,
      completed_at: (ingestion as any).completed_at || null,
    })
    .eq("id", ingestionId)
    .select("id, seo_payload, description_html, features")
    .maybeSingle();

  if (updErr) throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);

  const seo = updated?.seo_payload ?? result.seo;
  const descriptionHtml = updated?.description_html ?? result.descriptionHtml;
  const features = (updated?.features as any) ?? result.features;

  return {
    ingestionId,
    seo,
    descriptionHtml,
    features,

    // legacy aliases
    seo_payload: seo,
    description_html: descriptionHtml,
  };
}
