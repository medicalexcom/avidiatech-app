import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function looksUrlDerivedName(name: string) {
  const s = name.toLowerCase();
  return s.includes("http://") || s.includes("https://") || s.includes("www.") || s.includes("product for ");
}

function hasNonEmptySpecs(specs: any): boolean {
  if (!specs) return false;
  if (Array.isArray(specs)) return specs.length > 0;
  if (typeof specs === "object") return Object.keys(specs).length > 0;
  return false;
}

export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];
  _meta?: any;

  // legacy aliases
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

  const normalized = (ingestion as any).normalized_payload as AvidiaStandardNormalizedPayload | any;
  if (!normalized) throw new Error("missing_required_ingestion_payload");

  // HARD INPUT GATES (strict compliance: no hallucination)
  const name = normalized?.name;
  if (!isNonEmptyString(name) || looksUrlDerivedName(String(name))) {
    throw new Error("ingestion_not_ready: normalized_payload.name is missing or url-derived (re-ingest with proper name extraction)");
  }

  if (!hasNonEmptySpecs(normalized?.specs)) {
    throw new Error("ingestion_not_ready: normalized_payload.specs empty (re-ingest with includeSpecs=true)");
  }

  const startedAt = new Date().toISOString();

  const seoResult = await callSeoModel(
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
      instruction_source: seoResult?._meta?.instructionsSource ?? null,
      model: seoResult?._meta?.model ?? null,
      data_gaps: seoResult.data_gaps ?? [],
      sections: seoResult.sections ?? null,
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
    _meta: seoResult._meta,

    // legacy aliases
    seo_payload: seo,
    description_html: descriptionHtml,
  };
}
