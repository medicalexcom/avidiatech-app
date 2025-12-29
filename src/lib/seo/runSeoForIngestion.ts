import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import { mapSeoResultToStore } from "@/lib/seo/compatSeoMapping";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function looksUrlDerivedName(name: string) {
  const s = name.toLowerCase();
  return (
    s.includes("http://") ||
    s.includes("https://") ||
    s.includes("www.") ||
    s.includes("product for ")
  );
}

function hasNonEmptySpecs(specs: any): boolean {
  if (!specs) return false;
  if (Array.isArray(specs)) return specs.length > 0;
  if (typeof specs === "object") return Object.keys(specs).length > 0;
  return false;
}

/**
 * runSeoForIngestion
 *
 * Strict pipeline module:
 * - Loads normalized_payload (must be canonical avidia_standard after callback normalization)
 * - Hard gates: grounded name + non-empty specs
 * - Calls callSeoModel which enforces custom_gpt_instructions.md + auto-revision + no placeholders
 * - Persists BOTH:
 *    - seo_payload: full model output (including desc_audit) + compatibility top-level aliases
 *    - description_html, features, seo_generated_at
 * - Also persists diagnostics.seo metadata (model/instruction source + audit summary)
 */
export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;

  // canonical
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];
  desc_audit: any;
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
    throw new Error(
      "ingestion_not_ready: normalized_payload.name is missing or url-derived (re-ingest with proper name extraction)"
    );
  }

  if (!hasNonEmptySpecs(normalized?.specs)) {
    throw new Error(
      "ingestion_not_ready: normalized_payload.specs empty (re-ingest with includeSpecs=true)"
    );
  }

  const startedAt = new Date().toISOString();

  const seoResult = await callSeoModel(
    normalized as AvidiaStandardNormalizedPayload,
    (ingestion as any).correlation_id || null,
    (ingestion as any).source_url || null,
    (ingestion as any).tenant_id || null
  );

  const finishedAt = new Date().toISOString();

  // Persist richer diagnostics for observability without schema changes
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
      iterations: seoResult?._meta?.iterations ?? null,

      // helpful operational summaries
      data_gaps: seoResult.data_gaps ?? [],
      audit_score: typeof seoResult?.desc_audit?.score === "number" ? seoResult.desc_audit.score : null,
      audit_conflicts: Array.isArray(seoResult?.desc_audit?.conflicts) ? seoResult.desc_audit.conflicts : [],
    },
  };

  /**
   * Store full seo payload (recommended) but include compatibility aliases:
   * This keeps desc_audit and all structured outputs together while allowing legacy consumers
   * to read top-level h1/title/meta fields.
   */
  const seo_payload_to_store = mapSeoResultToStore(seoResult);

  const { data: updated, error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      seo_payload: seo_payload_to_store,
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

  // Prefer DB values (truth) but fall back to computed if needed
  const persistedSeoPayload = (updated as any)?.seo_payload ?? seo_payload_to_store;
  const persistedHtml = (updated as any)?.description_html ?? seoResult.descriptionHtml;
  const persistedFeatures = (updated as any)?.features ?? seoResult.features;

  // Canonical return shape for pipeline consumers
  return {
    ingestionId,

    descriptionHtml: persistedHtml,
    sections: seoResult.sections ?? null,
    seo: seoResult.seo ?? null,
    features: persistedFeatures ?? [],
    data_gaps: seoResult.data_gaps ?? [],
    desc_audit: seoResult.desc_audit ?? null,
    _meta: seoResult._meta ?? null,

    // legacy aliases
    seo_payload: persistedSeoPayload,
    description_html: persistedHtml,
  };
}
