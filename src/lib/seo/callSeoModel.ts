// src/lib/seo/callSeoModel.ts
// Updated: stricter Responses API schema, robust banned-token detection, improved HTML normalization,
// and relaxed "overview equals descriptionHtml" check using normalized text + token similarity auto-fix.
//
// Ready to drop into repository.

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
 * - Match banned tokens as whole words where appropriate (use \b)
 * - For tokens containing non-word chars (e.g., "n/a"), build a regex that allows punctuation boundaries
 * - Skip matching overly short ambiguous tokens (like "na") which cause false positives
 */
function containsBannedTokens(s: string): string | null {
  if (!s || typeof s !== "string") return null;
  const hay = s.toLowerCase();

  for (const token of BANNED_PLACEHOLDER_TOKENS) {
    const t = token.toLowerCase().trim();
    if (!t) continue;

    // Skip tiny ambiguous tokens (avoid "na" false positives)
    if (t.length <= 2 && !t.includes("/")) continue;

    // If token contains a slash or other non-word char (like "n/a"), match allowing punctuation boundaries
    if (/[^\w\s]/.test(t)) {
      const esc = escapeRegex(t);
      const re = new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i");
      if (re.test(hay)) return token;
      continue;
    }

    // Otherwise, match whole word(s)
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
 * to avoid false positives due to minor formatting differences. If normalized text exactly matches,
 * or token similarity >= SIMILARITY_THRESHOLD, we consider them equal.
 */
function validateSeoJsonOrThrow(json: any) {
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

  const SIMILARITY_THRESHOLD = 0.9; // 90% token overlap required to accept as equal

  const exactEqual = normOverview === normDesc;
  const tokenSim = tokenJaccardSimilarity(normOverview, normDesc);

  // Accept if exact normalized equality OR high token similarity
  requireField(
    exactEqual || tokenSim >= SIMILARITY_THRESHOLD,
    "central_gpt_seo_error: sections.overview_must_equal_descriptionHtml"
  );

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

  // HARD REQUIRE: no fallback instructions
  requireField(
    isNonEmptyString(instructions),
    "seo_missing_custom_instructions: custom_gpt_instructions are required"
  );

  // Ground truth packet: only use facts present here.
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

  // Strict schema: top-level and nested objects explicitly disallow additionalProperties
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

      // Clamp meta fields (SEO-safe caps)
      json.seo.title = String(json.seo.title || "").trim().slice(0, 70);
      json.seo.metaDescription = String(json.seo.metaDescription || "").trim().slice(0, 160);

      // --- Robust normalization and similarity-based auto-fix for overview equality ---
      try {
        const normOverview = htmlToNormalizedText(json.sections?.overview ?? "");
        const normDesc = htmlToNormalizedText(json.descriptionHtml ?? "");

        // If normalized exact match, set canonical
        if (normOverview && normDesc && normOverview === normDesc) {
          json.sections.overview = json.descriptionHtml;
        } else {
          // Otherwise compute token similarity and auto-fix when very similar
          const sim = tokenJaccardSimilarity(normOverview, normDesc);
          // Auto-fix threshold: 90% token overlap
          if (sim >= 0.9) {
            console.info("[seo] overview ~= descriptionHtml (sim=", sim.toFixed(3), "), auto-fixing overview");
            json.sections.overview = json.descriptionHtml;
          }
        }
      } catch (nfErr) {
        console.warn("normalizeHtmlForCompare failed:", nfErr);
      }

      // Enforce required output constraints (placeholders, specs bullets, overview match, desc_audit present)
      validateSeoJsonOrThrow(json);

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
        },
      };
    } catch (e: any) {
      lastViolation = e?.message || String(e);

      if (i === maxIterations) {
        const err: any = new Error(lastViolation.startsWith("central_gpt_") ? lastViolation : `central_gpt_seo_error: ${lastViolation}`);
        err.raw = lastRaw;
        throw err;
      }
      continue;
    }
  }

  const err: any = new Error("central_gpt_seo_error: exhausted_iterations");
  err.raw = lastRaw;
  throw err;
}
