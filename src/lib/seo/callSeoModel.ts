// (only changed: top-level schema.additionalProperties set to false)
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
  "na",
  "tbd",
  "to be determined",
  "unspecified",
];

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

function containsBannedTokens(s: string): string | null {
  const hay = s.toLowerCase();
  for (const t of BANNED_PLACEHOLDER_TOKENS) {
    if (hay.includes(t)) return t;
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
 * Hard validations to keep us compliant with custom_gpt_instructions.md
 * and to guarantee "no hallucination / no placeholders" behavior.
 *
 * NOTE: The model is asked to return desc_audit. We also enforce that:
 * - overview === descriptionHtml (exact string match)
 * - specs section exists and has >= 1 bullet
 * - no placeholders anywhere in customer-facing output
 * - name_best/H1 does not contain URL
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

  // overview must exactly equal descriptionHtml
  requireField(
    typeof json.sections.overview === "string" && json.sections.overview.trim().length > 0,
    "central_gpt_seo_error: sections.overview_missing"
  );
  requireField(
    String(json.sections.overview).trim() === String(json.descriptionHtml).trim(),
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
 * Returns:
 * - descriptionHtml: full store-ready HTML
 * - sections: structured HTML fragments
 * - seo: metadata payload
 * - features: list
 * - data_gaps: list of missing facts (compat)
 * - desc_audit: REQUIRED by custom_gpt_instructions.md (stored in seo payload)
 *
 * Strict enforcement:
 * - Custom instructions REQUIRED (no fallback)
 * - JSON schema strict REQUIRED
 * - sections.overview MUST equal descriptionHtml exactly (enforced by validation)
 * - No placeholders in customer-facing output
 * - No url-derived H1/name
 * - Up to 3 iterations with locked name_best (H1) (auto-revision mandate)
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
  // (Matches the instruction file's grounding contract inputs: dom/pdf_text/pdf_docs/browsed_text)
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
    // optional sources
    pdf_text: normalizedPayload.pdf_text ?? "",
    pdf_docs: [],
    browsed_text: normalizedPayload.description_raw ?? "",
    correlation_id: correlationId ?? null,
    tenant_id: tenantId ?? null,
  };

  const schema = {
    type: "object",
    additionalProperties: false, // <- STRICT: Responses API requires explicit false for strict json_schema
    required: ["seo", "descriptionHtml", "sections", "features", "data_gaps", "desc_audit"],
    properties: {
      seo: {
        type: "object",
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

      // Required by your instruction file (machine block)
      desc_audit: {
        type: "object",
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
    "4) sections.overview MUST equal descriptionHtml exactly.",
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

      // Clamp meta fields (SEO-safe caps; still keep as-is if shorter)
      json.seo.title = String(json.seo.title || "").trim().slice(0, 70);
      json.seo.metaDescription = String(json.seo.metaDescription || "").trim().slice(0, 160);

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
