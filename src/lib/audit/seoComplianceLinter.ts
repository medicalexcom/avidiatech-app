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

function safeSnippet(s: string, max = 260): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Basic HTML entity decoding (limited, deterministic) */
function decodeHtmlEntities(s: string): string {
  if (!s) return "";
  const replacements: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
  };
  let out = s;
  for (const [k, v] of Object.entries(replacements)) out = out.replace(new RegExp(k, "gi"), v);
  out = out.replace(/&#(\d+);/g, (_m, code) => {
    try {
      return String.fromCharCode(Number(code));
    } catch {
      return "";
    }
  });
  return out;
}

/** Normalize HTML-like string to plain text for containment/order comparisons */
function htmlToNormalizedText(s: any): string {
  if (s === null || s === undefined) return "";
  let t = String(s);
  t = t.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = decodeHtmlEntities(t);
  t = t.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Allowed placeholders (NOT violations):
 * - Any casing of "Not Applicable" with optional punctuation/parentheses.
 * - NA / N.A. / N/A / N / A (with optional punctuation/parentheses).
 */
const ALLOWED_PLACEHOLDER_TOKEN_RE =
  /(^|\b|\()(\s*(not\s+applicable|n\s*\/\s*a|n\s*\.\s*a\s*\.|n\s*\.\s*a|n\s*\/\s*a\.|na)\s*)(\)|\b|$)/i;

function isAllowedPlaceholderToken(match: string): boolean {
  const m = match.trim();
  return ALLOWED_PLACEHOLDER_TOKEN_RE.test(m);
}

/**
 * BANNED placeholders (blockers).
 * - "OK" is blocked per instruction.
 * - NA/N/A/Not Applicable variants are explicitly allowed.
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

/**
 * Brand handling rule:
 * - If normalized_payload.brand has multiple words (e.g., "Aspen Surgical"),
 *   enforce only the shortest single-word form at the front of H1 (e.g., "Aspen").
 *
 * Deterministic approach:
 * - Take the brand, split on whitespace, choose the shortest token (ties -> first shortest).
 * - Only use alphanumeric-ish tokens to avoid punctuation fragments.
 */
function chooseShortestBrandToken(brand: string): string {
  const tokens = brand
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")) // strip edge punctuation
    .filter((t) => /^[A-Za-z0-9]+$/.test(t));

  if (!tokens.length) return brand.trim();

  let best = tokens[0];
  for (const t of tokens) {
    if (t.length < best.length) best = t;
  }
  return best;
}

type SectionKey =
  | "overview"
  | "hook"
  | "mainDescription"
  | "featuresBenefits"
  | "specifications"
  | "internalLinks"
  | "whyChoose"
  | "manuals"
  | "faqs";

function getSections(seo_payload: any): any | null {
  if (!seo_payload) return null;
  if (seo_payload.sections && typeof seo_payload.sections === "object") return seo_payload.sections;
  return null;
}

function findOrderedSectionsInDescription(params: {
  descriptionHtml: string;
  sections: any;
  requiredOrder: Array<{ key: SectionKey; required: boolean }>;
}): {
  ok: boolean;
  missing: string[];
  notFoundInHtml: string[];
  outOfOrder: string[];
  positions: Record<string, number>;
} {
  const { descriptionHtml, sections, requiredOrder } = params;

  const missing: string[] = [];
  const notFoundInHtml: string[] = [];
  const outOfOrder: string[] = [];
  const positions: Record<string, number> = {};

  const normDesc = htmlToNormalizedText(descriptionHtml);

  let cursor = 0;
  for (const item of requiredOrder) {
    const raw = sections?.[item.key];

    const exists =
      typeof raw === "string"
        ? raw.trim().length > 0
        : item.key === "manuals"
          ? raw === null || typeof raw === "string"
          : false;

    if (!exists) {
      if (item.required) missing.push(item.key);
      positions[item.key] = -1;
      continue;
    }

    if (item.key === "manuals" && raw === null) {
      positions[item.key] = -2; // present but intentionally null
      continue;
    }

    const normSection = htmlToNormalizedText(raw);
    if (!normSection) {
      if (item.required) missing.push(item.key);
      positions[item.key] = -1;
      continue;
    }

    const idx = normDesc.indexOf(normSection, cursor);
    if (idx < 0) {
      notFoundInHtml.push(item.key);
      positions[item.key] = -1;
      continue;
    }

    positions[item.key] = idx;
    if (idx < cursor) outOfOrder.push(item.key);
    cursor = idx + Math.max(1, normSection.length);
  }

  const ok = missing.length === 0 && notFoundInHtml.length === 0 && outOfOrder.length === 0;
  return { ok, missing, notFoundInHtml, outOfOrder, positions };
}

/** Grounding v1: numeric+unit claims must be found in ground truth */
function extractNumericUnitClaims(html: string): string[] {
  const t = htmlToNormalizedText(html);
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

  const engineCb = normalizedPayload.engine_callback ?? null;
  if (engineCb && typeof engineCb === "object") {
    try {
      parts.push(JSON.stringify(engineCb));
    } catch {
      // ignore
    }
  }

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

  const seoPayload = params.seo_payload ?? {};
  const seo = seoPayload?.seo ?? seoPayload ?? {};
  const sections = getSections(seoPayload);

  const h1 = String(seo?.h1 ?? "");
  const title = String(seo?.title ?? "");
  const metaDescription = String(seo?.metaDescription ?? "");
  const shortDescription = String(seo?.shortDescription ?? "");
  const url = String(seo?.url ?? "");

  const html = String(params.description_html ?? "");
  const features = Array.isArray(params.features) ? params.features : [];

  const normalizedPayload = params.normalized_payload ?? null;
  const brandRaw = typeof normalizedPayload?.brand === "string" ? normalizedPayload.brand.trim() : "";
  const brandToken = brandRaw ? chooseShortestBrandToken(brandRaw) : "";

  // --- H1 checks
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

    // Brand-fronted H1: use shortest single-word brand token
    if (brandToken) {
      const re = new RegExp(`^${escapeRegex(brandToken)}(?:\\b|\\s|\\-|–|—|:|\\|)`, "i");
      if (!re.test(h1.trim())) {
        blockers.push({
          severity: "blocker",
          code: "H1_NOT_BRAND_TOKEN_FRONTED",
          message: `H1 must start with brand token (${brandToken}) derived from brand (${brandRaw}).`,
          field: "seo.h1",
          snippet: safeSnippet(h1),
          evidence: { brand: brandRaw, brandToken },
        });
      }
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

  // --- HTML checks
  if (!html.trim()) {
    blockers.push({ severity: "blocker", code: "HTML_MISSING", message: "Missing HTML description", field: "description_html" });
    checks.push({ key: "html", label: "HTML description present", status: "fail", detail: "description_html is empty" });
  } else {
    checks.push({ key: "html", label: "HTML description present", status: "pass" });

    // Option-1 enforcement: section fragments + fixed ordering; no heading title dependence
    if (!sections || typeof sections !== "object") {
      blockers.push({
        severity: "blocker",
        code: "SECTIONS_MISSING",
        message: "seo_payload.sections is missing; cannot validate required section ordering.",
        field: "seo_payload.sections",
      });
    } else {
      const requiredOrder: Array<{ key: SectionKey; required: boolean }> = [
        { key: "overview", required: true },
        { key: "hook", required: true },
        { key: "mainDescription", required: true },
        { key: "featuresBenefits", required: true },
        { key: "specifications", required: true },
        { key: "internalLinks", required: true },
        { key: "whyChoose", required: true },
        { key: "manuals", required: true }, // may be null but must exist per schema
        { key: "faqs", required: true },
      ];

      const orderCheck = findOrderedSectionsInDescription({
        descriptionHtml: html,
        sections,
        requiredOrder,
      });

      if (!orderCheck.ok) {
        if (orderCheck.missing.length) {
          blockers.push({
            severity: "blocker",
            code: "SECTIONS_MISSING_REQUIRED_FIELDS",
            message: `Missing required sections fields: ${orderCheck.missing.join(", ")}`,
            field: "seo_payload.sections",
            evidence: { missing: orderCheck.missing },
          });
        }
        if (orderCheck.notFoundInHtml.length) {
          blockers.push({
            severity: "blocker",
            code: "SECTIONS_NOT_FOUND_IN_DESCRIPTION_HTML",
            message: `Some section fragments are not present in descriptionHtml: ${orderCheck.notFoundInHtml.join(", ")}`,
            field: "description_html",
            evidence: { notFoundInHtml: orderCheck.notFoundInHtml, positions: orderCheck.positions },
          });
        }
        if (orderCheck.outOfOrder.length) {
          blockers.push({
            severity: "blocker",
            code: "SECTIONS_OUT_OF_ORDER",
            message: `Section fragments appear out of order in descriptionHtml: ${orderCheck.outOfOrder.join(", ")}`,
            field: "description_html",
            evidence: { outOfOrder: orderCheck.outOfOrder, positions: orderCheck.positions },
          });
        }
      }
    }

    // FAQs count heuristic: count <h3> in sections.faqs
    if (sections && typeof sections?.faqs === "string" && sections.faqs.trim()) {
      const qCount = (String(sections.faqs).match(/<h3\b/gi) ?? []).length;
      if (qCount < 5 || qCount > 7) {
        blockers.push({
          severity: "blocker",
          code: "FAQ_COUNT_OUT_OF_RANGE",
          message: `FAQs must include 5–7 Q&A pairs; detected ~${qCount} <h3> questions in sections.faqs.`,
          field: "seo_payload.sections.faqs",
          evidence: { qCount },
        });
      }
    }

    // Internal link count: count site-relative links in internalLinks fragment if present; fallback to full HTML
    const internalLinksHtml =
      sections && typeof sections?.internalLinks === "string" ? String(sections.internalLinks) : html;
    const internalLinksCount = (internalLinksHtml.match(/<a\s+[^>]*href=["']\/[^"']+["'][^>]*>/gi) ?? []).length;
    if (internalLinksCount !== 2) {
      blockers.push({
        severity: "blocker",
        code: "INTERNAL_LINKS_COUNT",
        message: `Exactly 2 internal links are required; detected ${internalLinksCount}.`,
        field: sections?.internalLinks ? "seo_payload.sections.internalLinks" : "description_html",
        evidence: { internalLinksCount },
      });
    }

    // Grounding v1: numeric+unit claims in descriptionHtml must be found in ground truth
    const claims = extractNumericUnitClaims(html);
    if (claims.length) {
      const gt = buildGroundTruthText(normalizedPayload);
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
