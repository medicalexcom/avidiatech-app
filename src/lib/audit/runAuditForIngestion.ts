import { getServiceSupabaseClient } from "@/lib/supabase";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { lintSeoOutput } from "@/lib/audit/seoComplianceLinter";

export type AuditResult = {
  ok: boolean;
  score: number;

  /**
   * Backwards-compatible shape:
   * - blockers/warnings remain string arrays (for existing UI expectations)
   * - checks remains the same shape
   */
  blockers: string[];
  warnings: string[];
  summary: string;
  checks: Array<{
    key: string;
    label: string;
    status: "pass" | "warn" | "fail";
    detail?: string;
  }>;

  /**
   * New structured detail (non-breaking additions):
   * Lets autoheal + human review see what failed and why.
   */
  violations?: {
    blockers: any[];
    warnings: any[];
    meta?: any;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Helper: prefer canonical nested seo.* fields, fall back to legacy top-level aliases.
 */
function getSeoValue(seoPayload: any, ...keys: string[]) {
  if (!seoPayload) return null;

  // Prefer nested canonical seo object first
  if (seoPayload.seo && typeof seoPayload.seo === "object") {
    for (const k of keys) {
      const v = seoPayload.seo[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }

  // Then check top-level aliases
  for (const k of keys) {
    const v = seoPayload[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  return null;
}

/**
 * Audit engine (v2):
 * - Uses a deterministic compliance linter (encodes key rules from custom_gpt_instructions.md)
 * - Keeps backwards-compatible blockers/warnings as string arrays
 * - Also attaches structured violations for autoheal/human review
 *
 * NOTE: This audit does NOT gate the pipeline anymore; it is informational + review tooling.
 */
export function auditSeoPayload(input: {
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
  normalized_payload?: any;
  instructionsText?: string | null;
}): AuditResult {
  const seoPayload = input.seo_payload || {};
  const description = typeof input.description_html === "string" ? input.description_html.trim() : "";
  const features = Array.isArray(input.features) ? input.features : [];
  const normalizedPayload = input.normalized_payload ?? null;

  // Use helper to prefer canonical nested keys but fall back to legacy aliases
  const h1Val = getSeoValue(seoPayload, "h1", "heading", "title");
  const titleVal = getSeoValue(seoPayload, "pageTitle", "title");
  const metaVal = getSeoValue(seoPayload, "metaDescription", "meta_description", "meta");
  const shortDescVal = getSeoValue(seoPayload, "shortDescription", "seoShortDescription", "seo_short_description");
  const urlVal = getSeoValue(seoPayload, "url", "generated_product_url", "generatedProductUrl");

  /**
   * Build a "canonical-ish" seo_payload object for the linter.
   * This avoids changing call sites or DB schema and reduces hard-coding:
   * we normalize legacy aliases into the linter’s expected shape.
   */
  const lintInputSeoPayload = {
    ...(seoPayload || {}),
    seo: {
      ...(typeof seoPayload?.seo === "object" ? seoPayload.seo : {}),
      h1: typeof h1Val === "string" ? h1Val.trim() : "",
      title: typeof titleVal === "string" ? titleVal.trim() : "",
      metaDescription: typeof metaVal === "string" ? metaVal.trim() : "",
      shortDescription: typeof shortDescVal === "string" ? shortDescVal.trim() : "",
      url: typeof urlVal === "string" ? urlVal.trim() : "",
    },
  };

  const lint = lintSeoOutput({
    instructionsText: input.instructionsText ?? null,
    seo_payload: lintInputSeoPayload,
    description_html: description,
    features,
    normalized_payload: normalizedPayload,
  });

  // Backwards-compatible strings (simple for UI/logging)
  const blockers = (lint.blockers || []).map((b: any) => b?.message || b?.code || String(b));
  const warnings = (lint.warnings || []).map((w: any) => w?.message || w?.code || String(w));

  // Deterministic score
  let score = 100;
  score -= blockers.length * 20;
  score -= warnings.length * 5;
  score = clamp(score, 0, 100);

  const ok = blockers.length === 0;

  const summary = ok
    ? `Audit passed with score ${score}/100.`
    : `Audit needs review with score ${score}/100. Blockers: ${(lint.blockers || []).map((b: any) => b?.code || "unknown").join(", ")}`;

  return {
    ok,
    score,
    blockers,
    warnings,
    summary,
    checks: (lint.checks as any) || [],
    violations: {
      blockers: lint.blockers || [],
      warnings: lint.warnings || [],
      meta: lint.meta || null,
    },
  };
}

export async function runAuditForIngestion(ingestionId: string) {
  const supabase = getServiceSupabaseClient();

  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select("id, seo_payload, description_html, features, normalized_payload, diagnostics, tenant_id")
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  if (!ingestion) throw new Error("ingestion_not_found");
  if (!ingestion.normalized_payload) throw new Error("ingestion_not_ready");

  const startedAt = new Date().toISOString();

  // Load canonical instructions (repo policy: local canonical file only; loader enforces this)
  // Prefer tenant_id if present, but loader ignores overrides by design.
  const { text: instructionsText } = await loadCustomGptInstructionsWithInfo((ingestion as any).tenant_id ?? null);

  const audit = auditSeoPayload({
    seo_payload: ingestion.seo_payload,
    description_html: ingestion.description_html,
    features: ingestion.features,
    normalized_payload: ingestion.normalized_payload,
    instructionsText: instructionsText ?? null,
  });

  const finishedAt = new Date().toISOString();

  // Persist into diagnostics.audit (no schema changes)
  const diagnostics = (ingestion as any).diagnostics || {};
  const auditDiagnostics = {
    ...(diagnostics.audit || {}),
    last_run_at: finishedAt,
    started_at: startedAt,

    /**
     * IMPORTANT:
     * We no longer want audit to imply pipeline gating.
     * Use "needs_review" instead of "failed" when blockers exist.
     */
    status: audit.ok ? "passed" : "needs_review",

    score: audit.score,
    blockers: audit.blockers,
    warnings: audit.warnings,
    checks: audit.checks,
    summary: audit.summary,

    // Structured violations for autoheal + human review (non-breaking addition)
    violations: audit.violations ?? null,
  };

  const updatedDiagnostics = {
    ...diagnostics,
    audit: auditDiagnostics,
  };

  const { error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      diagnostics: updatedDiagnostics,
      updated_at: finishedAt,
    })
    .eq("id", ingestion.id);

  if (updErr) throw new Error(`audit_persist_failed: ${updErr.message || String(updErr)}`);

  return {
    ingestionId: ingestion.id,
    audit,
  };
}
