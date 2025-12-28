// src/lib/seo/callSeoModel.ts
// Ready-to-drop: improved truncation using sentence-boundary preference with small allowed overrun,
// avoiding mid-word and mid-sentence cuts while respecting limits.
//
// - Title: max 70 chars, allow small overrun (12) to finish sentence if close.
// - Meta: max 160 chars, allow small overrun (20).
// - Falls back to clause, word-boundary, entity-safe, then hard-trim.

import OpenAI from "openai";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL =
  process.env.OPENAI_SEO_MODEL ||
  process.env.OPENAI_DESCRIBE_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const BANNED_PLACEHOLDER_TOKENS = [
  "not specified",
  "not provided",
  "not available",
  "information not available",
  "information not disclosed",
  "warranty information not available",
  "info not available",
  "unknown",
  "n/a",
  "tbd",
  "to be determined",
  "unspecified",
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function looksUrlDerivedOrPlaceholderName(name: string) {
  const s = name.toLowerCase();
  return (
    s.includes("http://") ||
    s.includes("https://") ||
    s.includes("www.") ||
    s.includes("product for ")
  );
}

/**
 * Improved placeholder detection:
 * - Match banned tokens as whole words where appropriate
 * - For tokens containing non-word chars (e.g., "n/a"), match allowing punctuation boundaries
 * - Skip overly short ambiguous tokens which cause false positives
 */
function containsBannedTokens(s: string): string | null {
  if (!s || typeof s !== "string") return null;
  const hay = s.toLowerCase();

  for (const token of BANNED_PLACEHOLDER_TOKENS) {
    const t = token.toLowerCase().trim();
    if (!t) continue;

    if (t.length <= 2 && !t.includes("/")) continue;

    if (/[^\w\s]/.test(t)) {
      const esc = escapeRegex(t);
      const re = new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i");
      if (re.test(hay)) return token;
      continue;
    }

    const esc = escapeRegex(t);
    const re = new RegExp(`\\b${esc}\\b`, "i");
    if (re.test(hay)) return token;
  }

  return null;
}

function requireField(condition: boolean, message: string) {
  if (!condition) {
    const err: any = new Error(message);
    err.code = "seo_invalid_model_output";
    throw err;
  }
}

/**
 * Truncate preferring sentence boundaries with controlled overrun and fallbacks.
 *
 * Behavior:
 * 1. If string length <= maxLen -> return unchanged.
 * 2. Try to find a sentence terminator (., !, ?) at or before maxLen; if found return up to it.
 * 3. If not found, allow small overrun (maxOverrun) to include a terminator shortly after maxLen.
 * 4. Fallback to clause boundary (comma/semicolon), then word boundary, then entity-safe back-up,
 *    and finally hard trim to maxLen.
 *
 * Does not append ellipsis. Returns the longest sensible substring <= maxLen (or slightly > maxLen
 * when overrun rule applies).
 */
function truncatePreferSentenceBoundary(s: string, maxLen: number, maxOverrun = 20): string {
  if (typeof s !== "string" || maxLen <= 0) return "";
  const str = s.trim();
  if (str.length <= maxLen) return str;

  // 1) Sentence terminator at or before maxLen
  for (let i = Math.min(str.length - 1, maxLen); i >= 0; i--) {
    const ch = str[i];
    if (ch === "." || ch === "!" || ch === "?") {
      // include punctuation
      const candidate = str.slice(0, i + 1).trim();
      if (candidate.length) return candidate;
      break;
    }
  }

  // 2) Allow small overrun to include terminator shortly after maxLen
  if (maxOverrun > 0) {
    const searchEnd = Math.min(str.length - 1, maxLen + maxOverrun);
    for (let i = maxLen + 1; i <= searchEnd; i++) {
      const ch = str[i];
      if (ch === "." || ch === "!" || ch === "?") {
        const candidate = str.slice(0, i + 1).trim();
        if (candidate.length) return candidate;
      }
    }
  }

  // 3) Clause boundary fallback (comma/semicolon)
  const lastClause = Math.max(str.lastIndexOf(",", maxLen), str.lastIndexOf(";", maxLen));
  if (lastClause > -1 && lastClause >= Math.floor(maxLen * 0.25)) {
    const candidate = str.slice(0, lastClause).trim();
    if (candidate.length) return candidate;
  }

  // 4) Word-boundary fallback: last whitespace before maxLen
  const upto = str.slice(0, maxLen);
  const lastSpace = Math.max(upto.lastIndexOf(" "), upto.lastIndexOf("\n"), upto.lastIndexOf("\t"));
  if (lastSpace > -1 && lastSpace >= Math.floor(maxLen * 0.2)) {
    const candidate = str.slice(0, lastSpace).trim();
    if (candidate.length) return candidate;
  }

  // 5) Try to avoid cutting an HTML entity
  const entityStart = upto.lastIndexOf("&");
  if (entityStart > 0) {
    const candidate = str.slice(0, entityStart).trim();
    if (candidate.length) return candidate;
  }

  // 6) Last resort: hard trim to maxLen (ensure non-empty)
  return str.slice(0, Math.max(1, maxLen));
}

/**
 * Extract text from OpenAI Responses API output safely.
 */
function extractTextFromResponses(res: any): string {
  const out0 = res?.output?.at?.(0) ?? res?.output?.[0] ?? null;
  if (!out0) return "";

  const content = out0?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    let text = "";
    for (const part of content) {
      if (typeof part === "string") text += part;
      else if (part?.text && typeof part.text === "string") text += part.text;
      else if (part?.content && typeof part.content === "string") text += part.content;
    }
    return text;
  }

  if (typeof out0?.text === "string") return out0.text;

  try {
    return JSON.stringify(out0);
  } catch {
    return "";
  }
}

function stripJsonFences(raw: string): string {
  const t = (raw || "").trim();
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenceMatch ? fenceMatch[1].trim() : t;
}

function countLi(html: string): number {
  const m = (html || "").match(/<li\b/gi);
  return m ? m.length : 0;
}

/**
 * Basic HTML entity decoding (common entities) and helper to normalize HTML -> plain text.
 */
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
  for (const [k, v] of Object.entries(replacements)) {
    out = out.replace(new RegExp(k, "gi"), v);
  }
  out = out.replace(/&#(\d+);/g, (_m, code) => {
    try {
      return String.fromCharCode(Number(code));
    } catch {
      return "";
    }
  });
  return out;
}

/**
 * Convert HTML-like string to normalized plain text for comparison:
 * - Expand escaped newline sequences ("\\n")
 * - Remove tags, decode entities, collapse whitespace
 */
function htmlToNormalizedText(s: any): string {
  if (s === null || s === undefined) return "";
  let t = String(s);

  // Expand escaped newline/tab sequences if present in raw model output
  t = t.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, " ");

  // Remove tags (replace with space to avoid concatenation)
  t = t.replace(/<[^>]+>/g, " ");

  // Decode common entities
  t = decodeHtmlEntities(t);

  // Normalize whitespace
  t = t.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

  return t;
}

/**
 * Compute a simple token-based similarity (Jaccard) between two normalized texts.
 * Returns a number in [0,1]. Uses lowercased word tokens, filters out short tokens (1-char).
 */
function tokenJaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normalizeTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

  const ta = new Set(normalizeTokens(a));
  const tb = new Set(normalizeTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const x of ta) {
    if (tb.has(x)) intersection++;
  }
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Hard validations to keep us compliant with custom_gpt_instructions.md
 * and to guarantee "no hallucination / no placeholders" behavior.
 *
 * NOTE: We compare normalized text (htmlToNormalizedText) + token similarity for overview equality
 * to avoid false positives due to minor formatting differences. When the check fails we throw an Error
 * that contains machine-readable debug details (normalized strings + similarity) in err.details.
 */
function validateSeoJsonOrThrow(json: any, similarityThreshold = 0.75) {
  requireField(json && typeof json === "object", "central_gpt_invalid_json");

  // required top-level fields
  requireField(json.seo && typeof json.seo === "object", "central_gpt_seo_error: missing seo");
  requireField(isNonEmptyString(json.seo.h1), "central_gpt_seo_error: missing seo.h1");
  requireField(isNonEmptyString(json.seo.title), "central_gpt_seo_error: missing seo.title");
  requireField(
    isNonEmptyString(json.seo.metaDescription),
    "central_gpt_seo_error: missing seo.metaDescription"
  );
  requireField(isNonEmptyString(json.descriptionHtml), "central_gpt_seo_error: missing descriptionHtml");
  requireField(json.sections && typeof json.sections === "object", "central_gpt_seo_error: missing sections");

  // must not be url-derived
  requireField(
    !looksUrlDerivedOrPlaceholderName(String(json.seo.h1)),
    "central_gpt_seo_error: h1_contains_url_or_placeholder"
  );

  // no placeholders anywhere in customer-facing output
  const aggregate = [
    String(json.seo?.h1 ?? ""),
    String(json.seo?.title ?? ""),
    String(json.seo?.metaDescription ?? ""),
    String(json.seo?.shortDescription ?? ""),
    String(json.descriptionHtml ?? ""),
    JSON.stringify(json.sections ?? {}),
  ].join("\n");

  const bad = containsBannedTokens(aggregate);
  requireField(!bad, `central_gpt_seo_error: banned_placeholder_token:${bad}`);

  // overview must be semantically equal to descriptionHtml (normalized text)
  requireField(
    typeof json.sections.overview === "string" && json.sections.overview.trim().length > 0,
    "central_gpt_seo_error: sections.overview_missing"
  );

  const normOverview = htmlToNormalizedText(json.sections.overview);
  const normDesc = htmlToNormalizedText(json.descriptionHtml);

  const exactEqual = normOverview === normDesc;
  const tokenSim = tokenJaccardSimilarity(normOverview, normDesc);

  if (!(exactEqual || tokenSim >= similarityThreshold)) {
    const err: any = new Error("central_gpt_seo_error: sections.overview_must_equal_descriptionHtml");
    // Provide machine-readable debug for the pipeline-runner to persist
    err.details = {
      normalizedOverview: normOverview,
      normalizedDescription: normDesc,
      tokenSimilarity: tokenSim,
      similarityThreshold,
    };
    throw err;
  }

  // specs must exist and have bullets
  requireField(
    typeof json.sections.specifications === "string" &&
      json.sections.specifications.trim().length > 0,
    "central_gpt_seo_error: sections.specifications_missing"
  );
  requireField(
    countLi(String(json.sections.specifications)) >= 1,
    "central_gpt_seo_error: specifications_has_no_bullets"
  );

  // desc_audit required by instruction file (we store it)
  requireField(
    json.desc_audit && typeof json.desc_audit === "object",
    "central_gpt_seo_error: desc_audit_missing"
  );
  requireField(
    Array.isArray(json.desc_audit.data_gaps),
    "central_gpt_seo_error: desc_audit.data_gaps_missing"
  );
}

/**
 * callSeoModel (STRICT, Describe-style)
 *
 * Returns: descriptionHtml, sections, seo, features, data_gaps, desc_audit, _meta
 */
export async function callSeoModel(
  normalizedPayload: AvidiaStandardNormalizedPayload,
  correlationId?: string | null,
  sourceUrl?: string | null,
  tenantId?: string | null
): Promise<{
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];
  desc_audit: any;
  _meta?: any;
}> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const { text: instructions, source: instructionsSource } =
    await loadCustomGptInstructionsWithInfo(tenantId ?? null);

  requireField(
    isNonEmptyString(instructions),
    "seo_missing_custom_instructions: custom_gpt_instructions are required"
  );

  const packet = {
    dom: {
      name_raw: normalizedPayload.name_raw || normalizedPayload.name,
      name: normalizedPayload.name,
      brand: normalizedPayload.brand ?? null,
      sku: normalizedPayload.sku ?? null,
      specs: normalizedPayload.specs ?? {},
      features_raw: normalizedPayload.features_raw ?? [],
      images: normalizedPayload.images ?? [],
      pdf_manual_urls: normalizedPayload.pdf_manual_urls ?? [],
      source_url: sourceUrl ?? null,
    },
    pdf_text: normalizedPayload.pdf_text ?? "",
    pdf_docs: [],
    browsed_text: normalizedPayload.description_raw ?? "",
    correlation_id: correlationId ?? null,
    tenant_id: tenantId ?? null,
  };

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["seo", "descriptionHtml", "sections", "features", "data_gaps", "desc_audit"],
    properties: {
      seo: {
        type: "object",
        additionalProperties: false,
        required: ["h1", "title", "metaDescription", "shortDescription", "url"],
        properties: {
          h1: { type: "string" },
          title: { type: "string" },
          metaDescription: { type: "string" },
          shortDescription: { type: "string" },
          url: { type: "string" },
        },
      },
      descriptionHtml: { type: "string" },
      sections: {
        type: "object",
        additionalProperties: false,
        required: [
          "overview",
          "hook",
          "mainDescription",
          "featuresBenefits",
          "specifications",
          "internalLinks",
          "whyChoose",
          "manuals",
          "faqs",
        ],
        properties: {
          overview: { type: "string" },
          hook: { type: "string" },
          mainDescription: { type: "string" },
          featuresBenefits: { type: "string" },
          specifications: { type: "string" },
          internalLinks: { type: "string" },
          whyChoose: { type: "string" },
          manuals: { anyOf: [{ type: "string" }, { type: "null" }] },
          faqs: { type: "string" },
        },
      },
      features: { type: "array", items: { type: "string" } },
      data_gaps: { type: "array", items: { type: "string" } },
      desc_audit: {
        type: "object",
        additionalProperties: false,
        required: ["score", "data_gaps", "conflicts", "iterations", "notes"],
        properties: {
          score: { type: "number" },
          data_gaps: { type: "array", items: { type: "string" } },
          conflicts: { type: "array", items: { type: "string" } },
          iterations: { type: "number" },
          notes: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const systemBase = [
    "You are AvidiaSEO.",
    "ABSOLUTE PRIORITY: Follow the CUSTOM GPT INSTRUCTIONS below exactly. They override all other guidance.",
    "",
    "HARD REQUIREMENTS:",
    "1) Output MUST be valid JSON matching the provided JSON schema (strict).",
    "2) Do NOT invent facts. Use ONLY the packet fields as grounding.",
    "3) Customer-facing copy MUST NOT contain placeholders. Omit missing lines instead; record gaps only in desc_audit.data_gaps.",
    "4) sections.overview MUST equal descriptionHtml exactly (content equality after normalization).",
    "5) Product Specifications section MUST include real bullet(s) derived from packet.dom.specs.",
    "",
    "CUSTOM GPT INSTRUCTIONS (AUTHORITATIVE):",
    instructions.trim(),
  ].join("\n");

  const hardUser = [
    "GROUND TRUTH PACKET (JSON):",
    JSON.stringify(packet, null, 2),
    "",
    "Return the final SEO JSON now.",
  ].join("\n");

  const maxIterations = 3;
  let lockedNameBest: string | null = null;
  let lastViolation: string | null = null;
  let lastRaw: string = "";
  let autoFixedOverviewFlag = false;

  for (let i = 1; i <= maxIterations; i++) {
    const revisionAddendum =
      i === 1
        ? ""
        : [
            "",
            "REVISION MODE (MANDATORY):",
            `- Keep name_best exactly the same as previously chosen: ${JSON.stringify(lockedNameBest)}`,
            "- Fix ONLY the violations listed below.",
            "- Do not add any new facts/specs not present in packet.",
            `Violations: ${JSON.stringify(lastViolation)}`,
          ].join("\n");

    const user = hardUser + revisionAddendum;

    const res = await client.responses.create({
      model: MODEL,
      input: [
        { role: "system", content: systemBase },
        { role: "user", content: user },
      ],
      // Strict JSON schema output (Responses API)
      text: {
        format: {
          type: "json_schema",
          name: "avidia_seo_schema",
          schema,
          strict: true,
        },
      },
    });

    const rawText = extractTextFromResponses(res);
    lastRaw = rawText;

    let json: any;
    try {
      json = JSON.parse(stripJsonFences(rawText));
    } catch (e: any) {
      lastViolation = "central_gpt_invalid_json";
      if (i === maxIterations) {
        const err: any = new Error("central_gpt_invalid_json");
        err.raw = rawText;
        throw err;
      }
      continue;
    }

    try {
      // Lock name_best / H1 after first valid response
      const h1 = String(json?.seo?.h1 ?? "").trim();
      requireField(isNonEmptyString(h1), "central_gpt_seo_error: missing seo.h1");

      if (!lockedNameBest) {
        requireField(!looksUrlDerivedOrPlaceholderName(h1), "central_gpt_seo_error: h1_contains_url_or_placeholder");
        lockedNameBest = h1;
      } else {
        requireField(h1 === lockedNameBest, "central_gpt_seo_error: name_best_changed");
      }

      // Ensure url exists; if missing, compute safe slug
      if (!isNonEmptyString(json?.seo?.url)) {
        json.seo.url = `/${lockedNameBest
          .toLowerCase()
          .replace(/&/g, " and ")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}/`;
      } else {
        const u = String(json.seo.url).trim();
        json.seo.url = u.startsWith("/") ? (u.endsWith("/") ? u : `${u}/`) : `/${u}/`;
      }

      // Truncate meta fields using sentence-preference truncation (no ellipsis)
      try {
        const rawTitle = String(json.seo.title || json.seo?.pageTitle || "").trim();
        const rawMeta = String(json.seo.metaDescription || json.seo?.meta_description || "").trim();

        const decodedTitle = decodeHtmlEntities(rawTitle);
        const decodedMeta = decodeHtmlEntities(rawMeta);

        // Title: 70 chars, allow small overrun to finish sentence
        json.seo.title = truncatePreferSentenceBoundary(decodedTitle, 70, 12);
        // Meta: 160 chars, allow up to 20 chars overrun to finish sentence
        json.seo.metaDescription = truncatePreferSentenceBoundary(decodedMeta, 160, 20);
      } catch (tErr) {
        // fallback to safe slice if unexpected
        json.seo.title = String(json.seo.title || json.seo?.pageTitle || "").trim().slice(0, 70);
        json.seo.metaDescription = String(json.seo.metaDescription || json.seo?.meta_description || "").trim().slice(0, 160);
      }

      // --- Robust normalization and similarity-based auto-fix for overview equality ---
      try {
        const overviewHtml = json.sections?.overview ?? "";
        const descHtml = json.descriptionHtml ?? "";
        const firstParaHtml = (function extractFirstParagraphHtml(html: string) {
          if (!html || typeof html !== "string") return "";
          const m = html.match(/<p[^>]*>[\s\S]*?<\/p>/i);
          if (m) return m[0];
          const idxH2 = html.search(/<h2\b/i);
          if (idxH2 >= 0) return html.slice(0, idxH2);
          const splitByDouble = html.split(/\n\s*\n/);
          return splitByDouble.length ? splitByDouble[0] : html;
        })(descHtml);

        const normOverview = htmlToNormalizedText(overviewHtml);
        const normFirstPara = htmlToNormalizedText(firstParaHtml);
        const normDesc = htmlToNormalizedText(descHtml);

        const simOverviewFirst = tokenJaccardSimilarity(normOverview, normFirstPara);
        const simOverviewDesc = tokenJaccardSimilarity(normOverview, normDesc);

        const SIMILARITY_THRESHOLD = 0.75;

        // If overview matches the first paragraph (or is highly similar), auto-fix overview
        if (normOverview && normFirstPara && (normOverview === normFirstPara || simOverviewFirst >= SIMILARITY_THRESHOLD)) {
          json.sections.overview = json.descriptionHtml;
          autoFixedOverviewFlag = true;
        } else {
          const exactEqual = normOverview === normDesc;
          const tokenSim = tokenJaccardSimilarity(normOverview, normDesc);
          if (exactEqual || tokenSim >= SIMILARITY_THRESHOLD) {
            json.sections.overview = json.descriptionHtml;
            autoFixedOverviewFlag = autoFixedOverviewFlag || tokenSim >= SIMILARITY_THRESHOLD;
          }
        }
      } catch (nfErr) {
        console.warn("normalize+first-paragraph logic failed:", nfErr);
      }

      // Enforce required output constraints (placeholders, specs bullets, overview match, desc_audit present)
      validateSeoJsonOrThrow(json, 0.75);

      // Compatibility: ensure top-level data_gaps matches desc_audit.data_gaps (prefer desc_audit)
      if (!Array.isArray(json.data_gaps)) json.data_gaps = [];
      if (Array.isArray(json.desc_audit?.data_gaps)) json.data_gaps = json.desc_audit.data_gaps;

      return {
        descriptionHtml: json.descriptionHtml,
        sections: json.sections,
        seo: json.seo,
        features: Array.isArray(json.features) ? json.features : [],
        data_gaps: Array.isArray(json.data_gaps) ? json.data_gaps : [],
        desc_audit: json.desc_audit,
        _meta: {
          model: MODEL,
          instructionsSource,
          iterations: i,
          autoFixedOverview: autoFixedOverviewFlag,
        },
      };
    } catch (e: any) {
      lastViolation = e?.message || String(e);

      if (i === maxIterations) {
        const err: any = new Error(lastViolation.startsWith("central_gpt_") ? lastViolation : `central_gpt_seo_error: ${lastViolation}`);
        err.raw = e?.raw ?? lastRaw ?? null;
        if (e?.details) err.details = e.details;
        if (e?.stack) err.innerStack = e.stack;
        throw err;
      }
      continue;
    }
  }

  const err: any = new Error("central_gpt_seo_error: exhausted_iterations");
  err.raw = lastRaw;
  throw err;
}
