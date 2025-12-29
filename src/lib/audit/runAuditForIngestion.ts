import { getServiceSupabaseClient } from "@/lib/supabase";

export type AuditResult = {
  ok: boolean;
  score: number;
  blockers: string[];
  warnings: string[];
  summary: string;
  checks: Array<{
    key: string;
    label: string;
    status: "pass" | "warn" | "fail";
    detail?: string;
  }>;
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
 * Minimal v1 audit:
 * - Ensures core SEO fields exist and meet basic quality gates
 * - Provides deterministic scoring for downstream gating
 *
 * Evolve this later into your full compliance engine (claims, contraindications, manuals, etc.).
 */
export function auditSeoPayload(input: {
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
}): AuditResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: AuditResult["checks"] = [];

  const seoPayload = input.seo_payload || {};
  const description = typeof input.description_html === "string" ? input.description_html.trim() : "";
  const features = Array.isArray(input.features) ? input.features : [];

  // Use helper to prefer canonical nested keys but fall back to legacy aliases
  const h1Val = getSeoValue(seoPayload, "h1", "heading", "title");
  const titleVal = getSeoValue(seoPayload, "pageTitle", "title");
  const metaVal = getSeoValue(seoPayload, "metaDescription", "meta_description", "meta");
  const shortDescVal = getSeoValue(seoPayload, "shortDescription", "seoShortDescription", "seo_short_description");

  const h1 = typeof h1Val === "string" ? h1Val.trim() : "";
  const title = typeof titleVal === "string" ? titleVal.trim() : "";
  const meta = typeof metaVal === "string" ? metaVal.trim() : "";
  const shortDesc = typeof shortDescVal === "string" ? shortDescVal.trim() : "";

  // H1
  if (!h1) {
    blockers.push("Missing H1");
    checks.push({
      key: "h1",
      label: "H1 present",
      status: "fail",
      detail: "seo_payload.h1 is empty",
    });
  } else {
    checks.push({ key: "h1", label: "H1 present", status: "pass" });
    if (h1.length < 10) warnings.push("H1 is unusually short");
  }

  // Title
  if (!title) {
    blockers.push("Missing page title");
    checks.push({
      key: "title",
      label: "Page title present",
      status: "fail",
      detail: "seo_payload.pageTitle/title is empty",
    });
  } else {
    checks.push({ key: "title", label: "Page title present", status: "pass" });
    if (title.length < 15) warnings.push("Page title is short");
    if (title.length > 70) warnings.push("Page title may be too long (>70 chars)");
  }

  // Meta description
  if (!meta) {
    blockers.push("Missing meta description");
    checks.push({
      key: "meta",
      label: "Meta description present",
      status: "fail",
      detail: "seo_payload.metaDescription/meta_description is empty",
    });
  } else {
    checks.push({ key: "meta", label: "Meta description present", status: "pass" });
    if (meta.length < 50) warnings.push("Meta description is short (<50 chars)");
    if (meta.length > 160) warnings.push("Meta description may be too long (>160 chars)");
  }

  // Short description
  if (!shortDesc) {
    warnings.push("Missing short description");
    checks.push({
      key: "short",
      label: "Short description present",
      status: "warn",
      detail: "seo_payload.seoShortDescription is empty",
    });
  } else {
    checks.push({ key: "short", label: "Short description present", status: "pass" });
  }

  // Description HTML
  if (!description) {
    blockers.push("Missing HTML description");
    checks.push({
      key: "html",
      label: "HTML description present",
      status: "fail",
      detail: "description_html is empty",
    });
  } else {
    checks.push({ key: "html", label: "HTML description present", status: "pass" });
    if (description.length < 200) warnings.push("HTML description is short");
    if (!description.includes("<h2") && !description.includes("<h3")) {
      warnings.push("HTML lacks section headings (h2/h3)");
    }
  }

  // Features
  if (!features.length) {
    warnings.push("No feature bullets found");
    checks.push({
      key: "features",
      label: "Feature bullets present",
      status: "warn",
      detail: "features[] is empty",
    });
  } else {
    checks.push({ key: "features", label: "Feature bullets present", status: "pass" });
    if (features.length < 3) warnings.push("Less than 3 feature bullets");
  }

  // Deterministic score
  let score = 100;
  score -= blockers.length * 20;
  score -= warnings.length * 5;
  score = clamp(score, 0, 100);

  const ok = blockers.length === 0;

  const summary = ok
    ? `Audit passed with score ${score}/100.`
    : `Audit failed with score ${score}/100. Blockers: ${blockers.join("; ")}`;

  return { ok, score, blockers, warnings, summary, checks };
}

export async function runAuditForIngestion(ingestionId: string) {
  const supabase = getServiceSupabaseClient();

  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select("id, seo_payload, description_html, features, normalized_payload, diagnostics")
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  if (!ingestion) throw new Error("ingestion_not_found");
  if (!ingestion.normalized_payload) throw new Error("ingestion_not_ready");

  const startedAt = new Date().toISOString();

  const audit = auditSeoPayload({
    seo_payload: ingestion.seo_payload,
    description_html: ingestion.description_html,
    features: ingestion.features,
  });

  const finishedAt = new Date().toISOString();

  // Persist into diagnostics.audit (no schema changes)
  const diagnostics = ingestion.diagnostics || {};
  const auditDiagnostics = {
    ...(diagnostics.audit || {}),
    last_run_at: finishedAt,
    started_at: startedAt,
    status: audit.ok ? "passed" : "failed",
    score: audit.score,
    blockers: audit.blockers,
    warnings: audit.warnings,
    checks: audit.checks,
    summary: audit.summary,
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
