import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

export async function runSeoForIngestion(ingestionId: string) {
  const supabase = getServiceSupabaseClient();

  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select(
      "id, tenant_id, user_id, source_url, normalized_payload, correlation_id, diagnostics, status"
    )
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) {
    throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  }
  if (!ingestion) {
    const e: any = new Error("ingestion_not_found");
    e.code = "ingestion_not_found";
    throw e;
  }
  if (!ingestion.normalized_payload) {
    const e: any = new Error("ingestion_not_ready");
    e.code = "ingestion_not_ready";
    throw e;
  }

  const normalized = ingestion.normalized_payload as any;
  const startedAt = new Date().toISOString();

  // identical call shape to existing route
  const seoResult = await callSeoModel(
    normalized,
    ingestion.correlation_id || null,
    ingestion.source_url || null,
    ingestion.tenant_id || null
  );

  const finishedAt = new Date().toISOString();

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
    throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);
  }

  return {
    ingestionId: ingestion.id,
    seo_payload: updatedRows?.seo_payload ?? seoResult.seo_payload,
    description_html: updatedRows?.description_html ?? seoResult.description_html,
    features: updatedRows?.features ?? seoResult.features,
  };
}
