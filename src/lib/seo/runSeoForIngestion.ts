import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import { repairSeoModel } from "@/lib/seo/repairSeoModel";
import { mapSeoResultToStore } from "@/lib/seo/compatSeoMapping";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { lintSeoOutput } from "@/lib/audit/seoComplianceLinter";

/**
 * This module enriches SEO input with the *full ingest engine callback body* (if available),
 * and performs Option-B autoheal:
 * - Generate SEO output
 * - Deterministically lint against compliance rules
 * - If blockers, repair up to 2 more attempts (total 3 attempts)
 * - Persist best output even if still failing (status = needs_review), and DO NOT block pipeline
 *
 * UPDATED:
 * - Accepts popup brand override and carries it through:
 *     opts.brandOverride -> seoInput.__brand_override
 * - Lints using FULL seo_payload (seo + sections), required for Option-1 section ordering enforcement
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

function buildLintSeoPayloadFromCandidate(candidate: any) {
  // IMPORTANT: linter needs BOTH seo + sections for Option-1 enforcement.
  return {
    seo: candidate?.seo ?? null,
    sections: candidate?.sections ?? null,
  };
}

export async function runSeoForIngestion(
  ingestionId: string,
  opts?: { brandOverride?: string | null }
): Promise<{
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

  const brandOverride =
    typeof opts?.brandOverride === "string" && opts.brandOverride.trim()
      ? opts.brandOverride.trim()
      : null;

  const seoInput: any = {
    ...(normalized ?? {}),
    // allow UI-provided brand to be used deterministically (no hallucination)
    __brand_override: brandOverride,

    engine_callback: engineLoad.ok ? engineLoad.engineCallback : null,
    engine_callback_meta: {
      bucket: ENGINE_PAYLOADS_BUCKET,
      ref: (ingestion as any).engine_payload_ref ?? null,
      sha256: (ingestion as any).engine_payload_sha256 ?? null,
      loaded: engineLoad.ok,
      load_reason: engineLoad.ok ? null : (engineLoad as any).reason ?? "unknown",
      top_level_keys: engineLoad.ok ? safeKeys(engineLoad.engineCallback) : [],
    },
  };

  // Load canonical instructions once for lint traceability
  const { text: instructionsText } = await loadCustomGptInstructionsWithInfo(
    (ingestion as any).tenant_id ?? null
  );

  const attempts: Array<{
    attempt: number;
    seoResult: any;
    lint: ReturnType<typeof lintSeoOutput>;
  }> = [];

  // Attempt 1: initial generation
  let currentSeoResult = await callSeoModel(
    seoInput as any,
    (ingestion as any).correlation_id || null,
    (ingestion as any).source_url || null,
    (ingestion as any).tenant_id || null
  );

  let currentLint = lintSeoOutput({
    instructionsText: instructionsText ?? null,
    seo_payload: buildLintSeoPayloadFromCandidate(currentSeoResult),
    description_html: String(currentSeoResult?.descriptionHtml ?? ""),
    features: Array.isArray(currentSeoResult?.features) ? currentSeoResult.features : [],
    // pass normalized payload including override so linter can enforce brand rules
    normalized_payload: seoInput,
  });

  attempts.push({ attempt: 1, seoResult: currentSeoResult, lint: currentLint });

  // Attempts 2-3: repair if blockers exist
  for (let attempt = 2; attempt <= 3; attempt++) {
    if (currentLint.ok) break;

    const violations = [...(currentLint.blockers || []), ...(currentLint.warnings || [])];

    currentSeoResult = await repairSeoModel({
      normalizedPayload: seoInput,
      correlationId: (ingestion as any).correlation_id || null,
      sourceUrl: (ingestion as any).source_url || null,
      tenantId: (ingestion as any).tenant_id || null,
      attempt,
      previousOutput: currentSeoResult,
      violations,
    });

    currentLint = lintSeoOutput({
      instructionsText: instructionsText ?? null,
      seo_payload: buildLintSeoPayloadFromCandidate(currentSeoResult),
      description_html: String(currentSeoResult?.descriptionHtml ?? ""),
      features: Array.isArray(currentSeoResult?.features) ? currentSeoResult.features : [],
      normalized_payload: seoInput,
    });

    attempts.push({ attempt, seoResult: currentSeoResult, lint: currentLint });
  }

  // Choose best attempt: prefer "ok"; else lowest blocker count; then lowest warning count
  const best = attempts
    .slice()
    .sort((a, b) => {
      const aOk = a.lint.ok ? 1 : 0;
      const bOk = b.lint.ok ? 1 : 0;
      if (aOk !== bOk) return bOk - aOk;

      const aBlock = (a.lint.blockers || []).length;
      const bBlock = (b.lint.blockers || []).length;
      if (aBlock !== bBlock) return aBlock - bBlock;

      const aWarn = (a.lint.warnings || []).length;
      const bWarn = (b.lint.warnings || []).length;
      return aWarn - bWarn;
    })[0];

  const seoResult = best.seoResult;
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
      iterations: seoResult?._meta?.iterations ?? null,

      engine_payload: {
        bucket: ENGINE_PAYLOADS_BUCKET,
        ref: (ingestion as any).engine_payload_ref ?? null,
        sha256: (ingestion as any).engine_payload_sha256 ?? null,
        loaded: engineLoad.ok,
        load_reason: engineLoad.ok ? null : (engineLoad as any).reason ?? "unknown",
        load_detail: (engineLoad as any).detail ?? null,
      },

      // record the UI brand override used (if any)
      brand_override: brandOverride,

      // Autoheal/compliance diagnostics
      compliance: {
        status: best.lint.ok ? "ok" : "needs_review",
        attempts: attempts.length,
        best_attempt: best.attempt,
        blockers: best.lint.blockers ?? [],
        warnings: best.lint.warnings ?? [],
        meta: best.lint.meta ?? null,
      },

      data_gaps: seoResult.data_gaps ?? [],
      audit_score: typeof seoResult?.desc_audit?.score === "number" ? seoResult.desc_audit.score : null,
      audit_conflicts: Array.isArray(seoResult?.desc_audit?.conflicts) ? seoResult.desc_audit.conflicts : [],
    },
  };

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

    seo_payload: persistedSeoPayload,
    description_html: persistedHtml,
  };
}
