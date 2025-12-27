import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";

/**
 * AvidiaSEO strict model call.
 *
 * Contract (Describe-style canonical naming):
 * Returns:
 * - seo (object)
 * - descriptionHtml (string)   // assembled from required section fragments
 * - features (string[])
 *
 * NO DUMMY OUTPUT:
 * - If the model output is missing required fields or fails validation,
 *   this throws (and caller must not persist partial output).
 */

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

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
 * Build full descriptionHtml from required section fragments.
 * This ensures we always have a structured multi-section output.
 */
function assembleDescriptionHtml(sections: {
  hook_html: string;
  main_description_title: string;
  main_description_html: string;
  features_html: string;
  specs_html: string;
  internal_links_html?: string; // optional if your prompt emits it as HTML instead of array
  why_choose_title: string;
  why_choose_html: string;
  manuals_html?: string; // optional
  faqs_html: string;
}) {
  const parts: string[] = [];

  // Hook
  parts.push(`<h2>Hook</h2>`);
  parts.push(sections.hook_html);

  // Main description
  parts.push(`<h2>${sections.main_description_title}</h2>`);
  parts.push(sections.main_description_html);

  // Features
  parts.push(`<h2>Features & Benefits</h2>`);
  parts.push(sections.features_html);

  // Specs
  parts.push(`<h2>Specifications</h2>`);
  parts.push(sections.specs_html);

  // Internal links (optional)
  if (isNonEmptyString(sections.internal_links_html)) {
    parts.push(`<h2>Explore More</h2>`);
    parts.push(sections.internal_links_html!);
  }

  // Why choose
  parts.push(`<h2>${sections.why_choose_title}</h2>`);
  parts.push(sections.why_choose_html);

  // Manuals (optional)
  if (isNonEmptyString(sections.manuals_html)) {
    parts.push(`<h2>Manuals</h2>`);
    parts.push(sections.manuals_html!);
  }

  // FAQs
  parts.push(`<h2>FAQs</h2>`);
  parts.push(sections.faqs_html);

  return parts.join("\n");
}

export async function callSeoModel(
  normalizedPayload: any,
  correlationId?: string | null,
  sourceUrl?: string | null,
  tenantId?: string | null
): Promise<{
  seo: any;
  descriptionHtml: string;
  features: string[];
  // optional debug
  _meta?: any;
}> {
  if (!CENTRAL_GPT_URL || !CENTRAL_GPT_KEY) {
    throw new Error("central_gpt_not_configured: CENTRAL_GPT_URL / CENTRAL_GPT_KEY missing");
  }

  const { text: instructions, source: instructionsSource } =
    await loadCustomGptInstructionsWithInfo(tenantId ?? null);

  // HARD REQUIRE: instructions must exist (per your rule: no fallback)
  requireField(
    isNonEmptyString(instructions),
    "seo_missing_custom_instructions: custom_gpt_instructions are required"
  );

  // Send normalized payload + enforce instructions
  const body = {
    module: "seo",
    payload: normalizedPayload,
    correlation_id: correlationId || undefined,

    custom_gpt_instructions: String(instructions).trim(),
    instruction_source: instructionsSource || undefined,
    enforce_instructions: true,

    // Ask central GPT to produce the strict AvidiaSEO structured output
    audit: { format: "avidia_seo_v1_strict" },

    // Optional context
    source_url: sourceUrl || undefined,
    tenant_id: tenantId || undefined,
  };

  const res = await fetch(CENTRAL_GPT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${CENTRAL_GPT_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`central_gpt_seo_error: ${res.status} ${text || "(empty body)"}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error("central_gpt_invalid_json");
  }

  /**
   * STRICT REQUIRED SHAPE
   * Your assemblePrompt.ts template already implies these keys.
   * We enforce them here with no fallback/dummy.
   */
  const hook_html = json?.hook_html;
  const main_description_title = json?.main_description_title;
  const main_description_html = json?.main_description_html;
  const features_html = json?.features_html;
  const specs_html = json?.specs_html;
  const why_choose_title = json?.why_choose_title;
  const why_choose_html = json?.why_choose_html;
  const faqs_html = json?.faqs_html;

  requireField(isNonEmptyString(hook_html), "seo_invalid_model_output: missing hook_html");
  requireField(
    isNonEmptyString(main_description_title),
    "seo_invalid_model_output: missing main_description_title"
  );
  requireField(
    isNonEmptyString(main_description_html),
    "seo_invalid_model_output: missing main_description_html"
  );
  requireField(isNonEmptyString(features_html), "seo_invalid_model_output: missing features_html");
  requireField(isNonEmptyString(specs_html), "seo_invalid_model_output: missing specs_html");
  requireField(isNonEmptyString(why_choose_title), "seo_invalid_model_output: missing why_choose_title");
  requireField(isNonEmptyString(why_choose_html), "seo_invalid_model_output: missing why_choose_html");
  requireField(isNonEmptyString(faqs_html), "seo_invalid_model_output: missing faqs_html");

  const seo = json?.seo ?? json?.seo_payload;
  requireField(seo && typeof seo === "object", "seo_invalid_model_output: missing seo object");

  // Required SEO fields
  requireField(isNonEmptyString(seo?.h1), "seo_invalid_model_output: missing seo.h1");
  requireField(
    isNonEmptyString(seo?.title || seo?.pageTitle),
    "seo_invalid_model_output: missing seo.title/pageTitle"
  );
  requireField(isNonEmptyString(seo?.metaDescription), "seo_invalid_model_output: missing seo.metaDescription");

  const features_list = json?.features_list ?? json?.features;
  requireField(Array.isArray(features_list), "seo_invalid_model_output: missing features_list array");
  requireField(features_list.length > 0, "seo_invalid_model_output: features_list is empty");

  // Optional sections (must not be dummy; ok if omitted)
  const manuals_html = json?.manuals_html;
  const internal_links_html = json?.internal_links_html;

  const descriptionHtml = assembleDescriptionHtml({
    hook_html,
    main_description_title,
    main_description_html,
    features_html,
    specs_html,
    internal_links_html,
    why_choose_title,
    why_choose_html,
    manuals_html,
    faqs_html,
  });

  requireField(isNonEmptyString(descriptionHtml), "seo_invalid_model_output: assembled descriptionHtml empty");

  return {
    seo,
    descriptionHtml,
    features: features_list.map((x: any) => String(x)).filter((s: string) => s.trim().length > 0),
    _meta: {
      instructionsSource,
      correlationId: correlationId || null,
      sourceUrl: sourceUrl || null,
    },
  };
}
