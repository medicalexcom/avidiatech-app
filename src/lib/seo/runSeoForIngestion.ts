import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

export async function runSeoForIngestion({
  ingestionId,
  options,
}: {
  ingestionId: string;
  options?: {
    profile?: string | null;
    strict?: boolean;
    model?: string | null;
  };
}) {
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

  // call central SEO model; options are passed through as metadata hints for now
  const seoResult = await callSeoModel(
    normalized,
    ingestion.correlation_id || null,
    ingestion.source_url || null,
    ingestion.tenant_id || null,
    options ?? {}
  );

  const finishedAt = new Date().toISOString();

  // merge diagnostics
  const diagnostics = ingestion.diagnostics || {};
  const seoDiagnostics = {
    ...(diagnostics.seo || {}),
    last_run_at: finishedAt,
    started_at: startedAt,
    status: "completed",
    options: options ?? null,
  };
  const updatedDiagnostics = {
    ...diagnostics,
    seo: seoDiagnostics,
  };

  // persist to product_ingestions (same contract as your existing route)
  const { data: updated, error: updErr } = await supabase
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
    .select("id, tenant_id, source_url, seo_payload, description_html, features, seo_generated_at")
    .maybeSingle();

  if (updErr) {
    throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);
  }

  return {
    ingestionId: ingestion.id,
    tenantId: ingestion.tenant_id ?? null,
    sourceUrl: ingestion.source_url ?? null,
    startedAt,
    finishedAt,
    options: options ?? null,
    result: seoResult,
    persisted: updated,
  };
}
