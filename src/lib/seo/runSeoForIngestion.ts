import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
}> {
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
    // Previously the route returned ingestion_load_failed 500
    throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  }

  if (!ingestion) {
    throw new Error("ingestion_not_found");
  }

  if (!ingestion.normalized_payload) {
    throw new Error("ingestion_not_ready");
  }

  const normalized = ingestion.normalized_payload as any;
  const startedAt = new Date().toISOString();

  // 4) Call central GPT (same args as before)
  const seoResult = await callSeoModel(
    normalized,
    ingestion.correlation_id || null,
    ingestion.source_url || null,
    ingestion.tenant_id || null
  );

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
    throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);
  }

  console.log("[api/v1/seo] SEO persisted", {
    ingestionId: ingestion.id,
    hasSeo: !!updatedRows?.seo_payload,
    hasDescription: !!updatedRows?.description_html,
    featuresCount: Array.isArray(updatedRows?.features) ? updatedRows?.features.length : null,
  });

  // 7) Return SEO to frontend (same output preference order as before)
  return {
    ingestionId: ingestion.id,
    seo_payload: updatedRows?.seo_payload ?? seoResult.seo_payload,
    description_html: updatedRows?.description_html ?? seoResult.description_html,
    features: updatedRows?.features ?? seoResult.features,
  };
}
