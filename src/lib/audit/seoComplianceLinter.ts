import crypto from "crypto";

export type ViolationSeverity = "blocker" | "warning";

export type ComplianceViolation = {
  severity: ViolationSeverity;
  code: string;
  message: string;
  field?: string;
  snippet?: string;
  evidence?: Record<string, any>;
};

export type ComplianceCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
};

export type LintResult = {
  ok: boolean; // no blockers
  blockers: ComplianceViolation[];
  warnings: ComplianceViolation[];
  checks: ComplianceCheck[];
  meta: {
    instructions_sha256: string | null;
  };
};

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function safeSnippet(s: string, max = 240): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Allowed placeholders (NOT violations):
 * - Any casing of "Not Applicable" with optional punctuation/parentheses.
 * - NA / N.A. / N/A / N / A (with optional punctuation/parentheses).
 */
const ALLOWED_PLACEHOLDER_TOKEN_RE =
  /(^|\b|\()(\s*(not\s+applicable|n\s*\/\s*a|n\s*\.\s*a\s*\.|na)\s*)(\)|\b|$)/i;

function isAllowedPlaceholderToken(match: string): boolean {
  const m = match.trim();
  // If the matched token contains "not applicable" or NA variants, allow.
  return ALLOWED_PLACEHOLDER_TOKEN_RE.test(m);
}

/**
 * BANNED placeholders (blockers).
 * We intentionally DO NOT include "NA/N/A/Not Applicable" here.
 * We DO include "OK" per your note.
 */
const BANNED_PLACEHOLDER_PATTERNS: Array<{ code: string; re: RegExp; example: string }> = [
  { code: "PLACEHOLDER_OK", re: /\bok\b/i, example: "OK" },
  { code: "PLACEHOLDER_NOT_AVAILABLE", re: /\bnot\s+available\b/i, example: "not available" },
  { code: "PLACEHOLDER_NOT_PROVIDED", re: /\bnot\s+provided\b/i, example: "not provided" },
  { code: "PLACEHOLDER_UNKNOWN", re: /\bunknown\b/i, example: "unknown" },
  { code: "PLACEHOLDER_TBD", re: /\btbd\b/i, example: "tbd" },
  { code: "PLACEHOLDER_TO_BE_DETERMINED", re: /\bto\s+be\s+determined\b/i, example: "to be determined" },
  { code: "PLACEHOLDER_INFO_NOT_AVAILABLE", re: /\binformation\s+not\s+available\b/i, example: "information not available" },
  { code: "PLACEHOLDER_INFO_NOT_DISCLOSED", re: /\binformation\s+not\s+disclosed\b/i, example: "information not disclosed" },
  { code: "PLACEHOLDER_UNSPECIFIED", re: /\bunspecified\b/i, example: "unspecified" },
];

function findBannedPlaceholders(text: string): Array<{ code: string; match: string; index: number }> {
  const hits: Array<{ code: string; match: string; index: number }> = [];
  const t = text ?? "";
  for (const p of BANNED_PLACEHOLDER_PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : `${p.re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const match = m[0] ?? "";
      // Allow if the matched token is within allowed placeholder token patterns.
      // (Example: "Not Applicable (N/A)" should not cause "OK" etc; but if "OK" appears it's banned.)
      if (isAllowedPlaceholderToken(match)) continue;
      hits.push({ code: p.code, match, index: m.index });
    }
  }
  return hits;
}

/**
 * H1 packaging repetition:
 * allow 0 or 1 packaging reference in H1; block 2+.
 */
function countPackagingRefs(h1: string): number {
  const t = h1 ?? "";
  const re =
    /(\b\d+\s*(?:count\s*)?(?:\/|per)\s*(?:box|bx|case|cs|pack|pk|bag|bg)\b)|(\b\d+\s*(?:box|bx|case|cs|pack|pk|bag|bg)\b)/gi;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) n++;
  return n;
}

function indexOfRegex(hay: string, re: RegExp, fromIndex = 0): number {
  const r = new RegExp(re.source, re.flags.replace("g", ""));
  const slice = hay.slice(fromIndex);
  const m = r.exec(slice);
  return m ? fromIndex + (m.index ?? 0) : -1;
}

/**
 * Avoid hardcoding exact heading text by matching "intent" patterns.
 * Still deterministic and transparent.
 */
function validateSectionOrder(descriptionHtml: string): { ok: boolean; missing: string[]; outOfOrder: string[] } {
  const html = descriptionHtml ?? "";
  const required = [
    { label: "Features and Benefits", re: /<h2[^>]*>[\s\S]*?features[\s\S]*?benefits[\s\S]*?<\/h2>/i },
    { label: "Product Specifications", re: /<h2[^>]*>[\s\S]*?product[\s\S]*?specifications[\s\S]*?<\/h2>/i },
    { label: "Why Choose", re: /<h2[^>]*>[\s\S]*?why[\s\S]*?(choose|love|this)[\s\S]*?<\/h2>/i },
    { label: "FAQs", re: /<h2[^>]*>[\s\S]*?(frequently asked questions|faqs?)[\s\S]*?<\/h2>/i },
  ];

  const missing: string[] = [];
  const outOfOrder: string[] = [];

  let pos = 0;
  for (const sec of required) {
    const idx = indexOfRegex(html, sec.re, pos);
    if (idx < 0) {
      missing.push(sec.label);
      continue;
    }
    if (idx < pos) outOfOrder.push(sec.label);
    pos = idx + 1;
  }

  return { ok: missing.length === 0 && outOfOrder.length === 0, missing, outOfOrder };
}

function extractNumericUnitClaims(html: string): string[] {
  const t = (html ?? "").replace(/<[^>]+>/g, " ");
  const re =
    /\b\d+(?:\.\d+)?\s*(?:lb|lbs|oz|in|inch|inches|ft|cm|mm|m|kg|g|mg|ml|mL|l|L|°f|°c|%|psi)\b/gim;
  const hits = t.match(re) ?? [];
  return Array.from(new Set(hits.map((s) => s.replace(/\s+/g, " ").trim())));
}

function buildGroundTruthText(normalizedPayload: any): string {
  const parts: string[] = [];
  if (!normalizedPayload) return "";

  const specs = normalizedPayload.specs ?? normalizedPayload.specs_structured ?? null;
  if (specs && typeof specs === "object") parts.push(JSON.stringify(specs));

  const pdfText = normalizedPayload.pdf_text ?? normalizedPayload.pdf_text_clean ?? "";
  if (typeof pdfText === "string" && pdfText.trim()) parts.push(pdfText);

  const browsed = normalizedPayload.description_raw ?? normalizedPayload.browsed_text ?? "";
  if (typeof browsed === "string" && browsed.trim()) parts.push(browsed);

  return parts.join("\n---\n");
}

export function lintSeoOutput(params: {
  instructionsText: string | null;
  seo_payload: any;
  description_html: string;
  features: any[];
  normalized_payload?: any;
}): LintResult {
  const blockers: ComplianceViolation[] = [];
  const warnings: ComplianceViolation[] = [];
  const checks: ComplianceCheck[] = [];

  const instructions_sha256 = params.instructionsText ? sha256(params.instructionsText) : null;

  const seo = params.seo_payload?.seo ?? params.seo_payload ?? {};
  const h1 = String(seo?.h1 ?? "");
  const title = String(seo?.title ?? "");
  const metaDescription = String(seo?.metaDescription ?? "");
  const shortDescription = String(seo?.shortDescription ?? "");
  const url = String(seo?.url ?? "");

  const html = String(params.description_html ?? "");
  const features = Array.isArray(params.features) ? params.features : [];

  // H1
  if (!h1.trim()) {
    blockers.push({ severity: "blocker", code: "H1_MISSING", message: "Missing H1", field: "seo.h1" });
    checks.push({ key: "h1", label: "H1 present", status: "fail", detail: "seo.h1 is empty" });
  } else {
    checks.push({ key: "h1", label: "H1 present", status: "pass" });

    const len = h1.trim().length;
    if (len < 90 || len > 110) {
      blockers.push({
        severity: "blocker",
        code: "H1_LENGTH_OUT_OF_BOUNDS",
        message: `H1 length must be 90–110 chars; got ${len}`,
        field: "seo.h1",
        snippet: safeSnippet(h1),
        evidence: { len },
      });
      checks.push({ key: "h1_len", label: "H1 length 90–110", status: "fail", detail: `len=${len}` });
    } else {
      checks.push({ key: "h1_len", label: "H1 length 90–110", status: "pass", detail: `len=${len}` });
    }

    if (/[™®©]/.test(h1)) {
      blockers.push({
        severity: "blocker",
        code: "H1_CONTAINS_TRADEMARK_SYMBOL",
        message: "H1 must not contain trademark/copyright symbols (™, ®, ©).",
        field: "seo.h1",
        snippet: safeSnippet(h1),
      });
    }

    if (/\bmade in\b/i.test(h1)) {
      blockers.push({
        severity: "blocker",
        code: "H1_CONTAINS_MADE_IN",
        message: "H1 must not contain country-of-origin phrases like 'Made in ...'.",
        field: "seo.h1",
        snippet: safeSnippet(h1),
      });
    }

    if (/\bsku\b[:\s]/i.test(h1) || /\b[A-Z0-9]{3,}-[A-Z0-9]{2,}\b/.test(h1)) {
      blockers.push({
        severity: "blocker",
        code: "H1_CONTAINS_SKU_LIKE_TOKEN",
        message: "H1 appears to contain SKU/model/part-number text; remove it.",
        field: "seo.h1",
        snippet: safeSnippet(h1),
      });
    }

    const packagingRefs = countPackagingRefs(h1);
    if (packagingRefs > 1) {
      blockers.push({
        severity: "blocker",
        code: "H1_PACKAGING_REPETITION",
        message:
          "H1 contains multiple packaging references; keep at most one (e.g., allow '100 gloves/box' but not '100/box, 10/case').",
        field: "seo.h1",
        snippet: safeSnippet(h1),
        evidence: { packagingRefs },
      });
    }
  }

  // Presence warnings (non-blocking)
  if (!title.trim()) warnings.push({ severity: "warning", code: "TITLE_MISSING", message: "Missing SEO title", field: "seo.title" });
  if (!metaDescription.trim())
    warnings.push({ severity: "warning", code: "META_DESCRIPTION_MISSING", message: "Missing meta description", field: "seo.metaDescription" });
  if (!shortDescription.trim())
    warnings.push({ severity: "warning", code: "SHORT_DESCRIPTION_MISSING", message: "Missing short description", field: "seo.shortDescription" });
  if (!url.trim()) warnings.push({ severity: "warning", code: "URL_MISSING", message: "Missing SEO url/slug", field: "seo.url" });

  // Placeholder scans (blockers; allow NA/N/A/Not Applicable variants)
  const placeholderFields: Array<{ field: string; text: string }> = [
    { field: "seo.title", text: title },
    { field: "seo.metaDescription", text: metaDescription },
    { field: "seo.shortDescription", text: shortDescription },
    { field: "description_html", text: html },
  ];

  for (const pf of placeholderFields) {
    const hits = findBannedPlaceholders(pf.text);
    for (const hit of hits) {
      blockers.push({
        severity: "blocker",
        code: hit.code,
        message: `Banned placeholder phrase detected: "${hit.match}"`,
        field: pf.field,
        snippet: safeSnippet(pf.text.slice(Math.max(0, hit.index - 80), hit.index + 160)),
        evidence: { match: hit.match, index: hit.index },
      });
    }
  }

  // HTML checks
  if (!html.trim()) {
    blockers.push({ severity: "blocker", code: "HTML_MISSING", message: "Missing HTML description", field: "description_html" });
    checks.push({ key: "html", label: "HTML description present", status: "fail", detail: "description_html is empty" });
  } else {
    checks.push({ key: "html", label: "HTML description present", status: "pass" });

    const order = validateSectionOrder(html);
    if (!order.ok) {
      if (order.missing.length) {
        blockers.push({
          severity: "blocker",
          code: "HTML_MISSING_REQUIRED_SECTIONS",
          message: `HTML is missing required sections: ${order.missing.join(", ")}`,
          field: "description_html",
        });
      }
      if (order.outOfOrder.length) {
        blockers.push({
          severity: "blocker",
          code: "HTML_SECTIONS_OUT_OF_ORDER",
          message: `HTML sections appear out of order: ${order.outOfOrder.join(", ")}`,
          field: "description_html",
        });
      }
    }

    // FAQs count heuristic (count <h3> after FAQ heading)
    const faqsHeaderIdx = (html.match(/<h2[^>]*>[\s\S]*?(frequently asked questions|faqs?)\s*<\/h2>/i)?.index ?? -1);
    if (faqsHeaderIdx >= 0) {
      const after = html.slice(faqsHeaderIdx);
      const qCount = (after.match(/<h3\b/gi) ?? []).length;
      if (qCount < 5 || qCount > 7) {
        blockers.push({
          severity: "blocker",
          code: "FAQ_COUNT_OUT_OF_RANGE",
          message: `FAQs must include 5–7 Q&A pairs; detected ~${qCount} <h3> questions.`,
          field: "description_html",
          evidence: { qCount },
        });
      }
    }

    // Internal link count (site-relative only)
    const internalLinks = (html.match(/<a\s+[^>]*href=["']\/[^"']+["'][^>]*>/gi) ?? []).length;
    if (internalLinks !== 2) {
      blockers.push({
        severity: "blocker",
        code: "INTERNAL_LINKS_COUNT",
        message: `Exactly 2 internal links are required; detected ${internalLinks}.`,
        field: "description_html",
        evidence: { internalLinks },
      });
    }

    // Grounding v1
    const claims = extractNumericUnitClaims(html);
    if (claims.length) {
      const gt = buildGroundTruthText(params.normalized_payload);
      const missing: string[] = [];
      for (const c of claims) {
        if (!gt || !gt.toLowerCase().includes(c.toLowerCase())) missing.push(c);
      }
      if (missing.length) {
        blockers.push({
          severity: "blocker",
          code: "UNGROUNDED_NUMERIC_CLAIMS",
          message: `Numeric/unit claims not traceable to ground truth: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}`,
          field: "description_html",
          evidence: { missing, totalClaims: claims.length },
        });
      }
    }
  }

  // Features
  if (!features.length) {
    warnings.push({ severity: "warning", code: "FEATURES_EMPTY", message: "No feature bullets found (features[] is empty)", field: "features" });
    checks.push({ key: "features", label: "Feature bullets present", status: "warn", detail: "features[] is empty" });
  } else {
    checks.push({ key: "features", label: "Feature bullets present", status: "pass" });
    if (features.length < 3) {
      warnings.push({
        severity: "warning",
        code: "FEATURES_FEW",
        message: "Less than 3 feature bullets found.",
        field: "features",
        evidence: { count: features.length },
      });
    }
  }

  const ok = blockers.length === 0;
  return { ok, blockers, warnings, checks, meta: { instructions_sha256 } };
}
