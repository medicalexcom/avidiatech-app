import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import { mapSeoResultToStore } from "@/lib/seo/compatSeoMapping";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";

/**
 * This module now optionally enriches the SEO input with the *full ingest engine callback body*
 * stored in Supabase Storage (private bucket).
 *
 * Goal (per your request):
 * - Prefer using the complete extracted data from ingest-engine-payloads for SEO input.
 * - Do NOT hard-fail / do NOT hard-code strict gates.
 * - Still persist seo_payload/description_html/features/diagnostics as before.
 *
 * Notes:
 * - We pass a merged payload to callSeoModel:
 *    - base: normalized_payload (avidia_standard)
 *    - plus: engine_callback (entire callback body JSON) under `engine_callback`
 * - This requires NO changes to pipeline/internal/seo route. It already calls runSeoForIngestion().
 * - If bucket/ref are missing or download fails, we gracefully fall back to normalized_payload only.
 */

const ENGINE_PAYLOADS_BUCKET =
  process.env.INGEST_ENGINE_PAYLOADS_BUCKET || "ingest-engine-payloads";

function safeKeys(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  try {
    return Object.keys(obj);
  } catch {
    return [];
  }
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function loadEngineCallbackJson(opts: {
  supabase: any;
  ingestionId: string;
  engine_payload_ref?: string | null;
}) {
  const ref = opts.engine_payload_ref;
  if (!ref) {
    return { ok: false as const, reason: "missing_engine_payload_ref", engineCallback: null };
  }

  try {
    const { data: blob, error } = await opts.supabase.storage
      .from(ENGINE_PAYLOADS_BUCKET)
      .download(ref);

    if (error || !blob) {
      return {
        ok: false as const,
        reason: "engine_payload_download_failed",
        detail: String(error?.message ?? error ?? "unknown"),
        engineCallback: null,
      };
    }

    const text = await blob.text();
    const json = safeJsonParse(text);

    if (!json) {
      return { ok: false as const, reason: "engine_payload_not_json", engineCallback: null };
    }

    return { ok: true as const, engineCallback: json };
  } catch (e: any) {
    return {
      ok: false as const,
      reason: "engine_payload_download_threw",
      detail: String(e?.message ?? e),
      engineCallback: null,
    };
  }
}

/**
 * runSeoForIngestion
 *
 * - Loads normalized_payload (canonical avidia_standard after callback normalization)
 * - ALSO attempts to load full engine callback JSON from Storage and attaches it to the payload.
 * - No hard fail gates (per your request).
 * - Calls callSeoModel (which enforces your SEO instruction discipline).
 * - Persists seo_payload + description_html + features + seo_generated_at + diagnostics.seo metadata.
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
    .select(
      "id, tenant_id, source_url, normalized_payload, correlation_id, diagnostics, engine_payload_ref, engine_payload_sha256"
    )
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  if (!ingestion) throw new Error("ingestion_not_found");

  const normalized = (ingestion as any).normalized_payload as AvidiaStandardNormalizedPayload | any;

  const startedAt = new Date().toISOString();

  // Attempt to load full engine callback JSON (graceful fallback if missing)
  const engineLoad = await loadEngineCallbackJson({
    supabase,
    ingestionId,
    engine_payload_ref: (ingestion as any).engine_payload_ref ?? null,
  });

  // Build SEO input payload:
  // - Keep normalized_payload at the root so existing callSeoModel behavior stays compatible.
  // - Attach the entire engine callback body under `engine_callback`.
  //   (You can later update callSeoModel to use it fully.)
  const seoInput: any = {
    ...(normalized ?? {}),
    engine_callback: engineLoad.ok ? engineLoad.engineCallback : null,
    engine_callback_meta: {
      bucket: ENGINE_PAYLOADS_BUCKET,
      ref: (ingestion as any).engine_payload_ref ?? null,
      sha256: (ingestion as any).engine_payload_sha256 ?? null,
      loaded: engineLoad.ok,
      load_reason: engineLoad.ok ? null : (engineLoad as any).reason ?? "unknown",
      // helpful for debugging what keys are present (no hardcoding)
      top_level_keys: engineLoad.ok ? safeKeys(engineLoad.engineCallback) : [],
    },
  };

  // Call model. We still provide correlation/source/tenant like before.
  // NOTE: callSeoModel currently expects an AvidiaStandardNormalizedPayload; we pass an enriched object.
  const seoResult = await callSeoModel(
    seoInput as any,
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

      // record whether we used the storage snapshot (no hard fail)
      engine_payload: {
        bucket: ENGINE_PAYLOADS_BUCKET,
        ref: (ingestion as any).engine_payload_ref ?? null,
        sha256: (ingestion as any).engine_payload_sha256 ?? null,
        loaded: engineLoad.ok,
        load_reason: engineLoad.ok ? null : (engineLoad as any).reason ?? "unknown",
        load_detail: (engineLoad as any).detail ?? null,
      },

      // helpful operational summaries
      data_gaps: seoResult.data_gaps ?? [],
      audit_score:
        typeof seoResult?.desc_audit?.score === "number" ? seoResult.desc_audit.score : null,
      audit_conflicts: Array.isArray(seoResult?.desc_audit?.conflicts)
        ? seoResult.desc_audit.conflicts
        : [],
    },
  };

  /**
   * Store full seo payload (recommended) but include compatibility aliases:
   * Keeps desc_audit and structured outputs together while allowing legacy consumers
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
