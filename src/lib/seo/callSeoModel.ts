import OpenAI from "openai";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL =
  process.env.OPENAI_SEO_MODEL ||
  process.env.OPENAI_DESCRIBE_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function requireField(condition: boolean, message: string) {
  if (!condition) {
    const err: any = new Error(message);
    err.code = "seo_invalid_model_output";
    throw err;
  }
}

/**
 * Extract text from OpenAI Responses API output safely (same idea as Describe).
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

/**
 * callSeoModel (STRICT, Describe-style)
 *
 * Returns:
 * - descriptionHtml: full store-ready HTML
 * - sections: structured HTML fragments
 * - seo: metadata payload
 * - features: list
 * - data_gaps: list of missing facts
 *
 * Strict enforcement:
 * - Custom instructions REQUIRED (no fallback)
 * - JSON schema strict REQUIRED
 * - sections.overview MUST equal descriptionHtml exactly
 * - No empty section strings
 */
export async function callSeoModel(
  normalizedPayload: any,
  correlationId?: string | null,
  sourceUrl?: string | null,
  tenantId?: string | null
): Promise<{
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];
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

  const system = `
You are AvidiaSEO.

You MUST follow the provided CUSTOM GPT INSTRUCTIONS exactly (binding).
You MUST return ONLY valid JSON that matches the provided JSON Schema (strict).
No markdown. No commentary. No placeholders. No dummy/demo text. No hard-coded content.

CRITICAL OUTPUT RULE:
- descriptionHtml MUST be the FULL store-ready HTML (the product page description to display in the store).
- sections.overview MUST equal descriptionHtml exactly (same string).
- Other sections.* must be meaningful non-empty HTML fragments (not placeholders).

If required factual inputs are missing, you must:
- omit unsupported claims
- and list missing items in data_gaps (string array)
But you must STILL output all required keys and valid HTML in each section (grounded and compliant).
`.trim();

  const user = `
CUSTOM GPT INSTRUCTIONS (BINDING):
${String(instructions).trim()}

INPUT (normalized payload; treat as the single source of truth):
${JSON.stringify(
  {
    correlationId: correlationId || null,
    sourceUrl: sourceUrl || null,
    tenantId: tenantId || null,
    normalizedPayload: normalizedPayload ?? {},
  },
  null,
  2
)}
`.trim();

  const res = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.1,
    max_output_tokens: 12000,

    text: {
      format: {
        type: "json_schema",
        name: "AvidiaSeoStrictV1",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,

          // OpenAI strict validator: required must include EVERY key in properties
          required: ["descriptionHtml", "sections", "seo", "features", "data_gaps"],

          properties: {
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
                manuals: { type: "string" },
                faqs: { type: "string" },
              },
            },

            seo: {
              type: "object",
              additionalProperties: false,
              required: ["h1", "title", "metaDescription", "shortDescription"],
              properties: {
                h1: { type: "string" },
                title: { type: "string" },
                metaDescription: { type: "string" },
                shortDescription: { type: "string" },
              },
            },

            features: {
              type: "array",
              items: { type: "string" },
            },

            data_gaps: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  });

  const textOut = extractTextFromResponses(res);

  let json: any = null;
  try {
    json = JSON.parse(textOut || "{}");
  } catch (e: any) {
    const err: any = new Error("seo_invalid_model_output: model returned non-JSON");
    err.code = "seo_invalid_model_output";
    err.debug = { raw: textOut?.slice?.(0, 4000) ?? "" };
    throw err;
  }

  // Additional hard checks (beyond schema) to prevent empty/dummy sections
  requireField(isNonEmptyString(json?.descriptionHtml), "seo_invalid_model_output: descriptionHtml empty");

  const sections = json?.sections || {};
  for (const k of [
    "overview",
    "hook",
    "mainDescription",
    "featuresBenefits",
    "specifications",
    "internalLinks",
    "whyChoose",
    "manuals",
    "faqs",
  ]) {
    requireField(isNonEmptyString(sections?.[k]), `seo_invalid_model_output: sections.${k} empty`);
  }

  // Enforce overview === full descriptionHtml
  requireField(
    String(sections.overview).trim() === String(json.descriptionHtml).trim(),
    "seo_invalid_model_output: sections.overview must equal descriptionHtml"
  );

  const seo = json?.seo || {};
  requireField(isNonEmptyString(seo?.h1), "seo_invalid_model_output: seo.h1 empty");
  requireField(isNonEmptyString(seo?.title), "seo_invalid_model_output: seo.title empty");
  requireField(isNonEmptyString(seo?.metaDescription), "seo_invalid_model_output: seo.metaDescription empty");
  requireField(isNonEmptyString(seo?.shortDescription), "seo_invalid_model_output: seo.shortDescription empty");

  requireField(Array.isArray(json?.features), "seo_invalid_model_output: features must be array");
  requireField(Array.isArray(json?.data_gaps), "seo_invalid_model_output: data_gaps must be array");

  return {
    descriptionHtml: json.descriptionHtml,
    sections: json.sections,
    seo: json.seo,
    features: json.features,
    data_gaps: json.data_gaps,
    _meta: {
      instructionsSource,
      correlationId: correlationId || null,
      sourceUrl: sourceUrl || null,
      tenantId: tenantId || null,
      model: MODEL,
    },
  };
}
