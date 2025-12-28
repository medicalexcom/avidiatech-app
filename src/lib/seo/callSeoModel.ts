import { loadSeoInstructions } from "@/lib/seo/loadSeoInstructions";
import type { AvidiaStandardNormalizedPayload } from "@/lib/ingest/avidiaStandard";

type SeoResult = {
  seo: {
    h1: string;
    title: string;
    metaDescription: string;
    shortDescription: string;
    url: string;
  };
  descriptionHtml: string;
  sections: Record<string, string | null>;
  features: string[];
  data_gaps: string[];
  _meta?: {
    model?: string | null;
    instructionsSource?: string | null;
    instructionsPath?: string | null;
    iterations?: number;
  };
};

const BANNED_PLACEHOLDER_TOKENS = [
  "not specified",
  "not provided",
  "not available",
  "information not available",
  "information not disclosed",
  "n/a",
  "tbd",
  "unknown",
];

function containsBannedTokens(s: string): string | null {
  const hay = s.toLowerCase();
  for (const t of BANNED_PLACEHOLDER_TOKENS) {
    if (hay.includes(t)) return t;
  }
  return null;
}

function looksUrlDerivedName(name: string) {
  const s = name.toLowerCase();
  return s.includes("http://") || s.includes("https://") || s.includes("www.") || s.includes("product for ");
}

function countSpecBullets(html: string): number {
  const matches = html.match(/<li\b/gi);
  return matches ? matches.length : 0;
}

function requireNonEmptyString(v: any, label: string) {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`central_gpt_seo_error: missing_required_field:${label}`);
  }
}

function clampString(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateOutputOrThrow(out: any) {
  if (!out || typeof out !== "object") throw new Error("central_gpt_invalid_json");
  if (!out.seo || typeof out.seo !== "object") throw new Error("central_gpt_seo_error: missing seo object");

  requireNonEmptyString(out.seo.h1, "seo.h1");
  requireNonEmptyString(out.seo.title, "seo.title");
  requireNonEmptyString(out.seo.metaDescription, "seo.metaDescription");
  requireNonEmptyString(out.descriptionHtml, "descriptionHtml");

  if (looksUrlDerivedName(out.seo.h1)) {
    throw new Error("central_gpt_seo_error: invalid_h1_contains_url_or_placeholder");
  }

  const htmlAggregate =
    String(out.descriptionHtml || "") +
    "\n" +
    JSON.stringify(out.sections || {}) +
    "\n" +
    JSON.stringify(out.seo || {});

  const bad = containsBannedTokens(htmlAggregate);
  if (bad) throw new Error(`central_gpt_seo_error: banned_placeholder_token:${bad}`);

  if (!out.sections || typeof out.sections !== "object") {
    throw new Error("central_gpt_seo_error: missing sections object");
  }

  const specsHtml = out.sections.specifications;
  if (typeof specsHtml !== "string" || !specsHtml.trim()) {
    throw new Error("central_gpt_seo_error: missing_required_section:specifications");
  }
  if (countSpecBullets(specsHtml) < 1) {
    throw new Error("central_gpt_seo_error: specifications_has_no_bullets");
  }

  // Contract: overview must match descriptionHtml
  if (typeof out.sections.overview === "string" && out.sections.overview.trim()) {
    if (out.sections.overview.trim() !== String(out.descriptionHtml || "").trim()) {
      throw new Error("central_gpt_seo_error: sections.overview_must_equal_descriptionHtml");
    }
  }
}

/**
 * callSeoModel
 *
 * Enforces key parts of tools/render-engine/prompts/custom_gpt_instructions.md:
 * - no placeholders, no url-derived names
 * - Product Specifications required and non-empty (derived from input specs only)
 * - 1 draft + up to 2 auto-revise passes (max 3 total)
 */
export async function callSeoModel(
  normalized: AvidiaStandardNormalizedPayload,
  correlationId: string | null,
  sourceUrl: string | null,
  tenantId: string | null
): Promise<SeoResult> {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.CENTRAL_GPT_API_KEY ||
    "";

  if (!apiKey) throw new Error("central_gpt_not_configured: missing OPENAI_API_KEY");

  const { instructions, source: instructionsSource, resolvedPath } = await loadSeoInstructions();

  const productName = normalized.name;
  const brand = normalized.brand || null;
  const specs = normalized.specs || {};
  const features = normalized.features_raw || [];
  const pdfText = normalized.pdf_text || null;
  const descriptionRaw = normalized.description_raw || null;

  const factsPacket = {
    format: normalized.format,
    name: productName,
    brand,
    sku: normalized.sku || null,
    source_url: sourceUrl || null,
    specs,
    features_raw: features,
    pdf_text: pdfText,
    description_raw: descriptionRaw,
    images: normalized.images || [],
    pdf_manual_urls: normalized.pdf_manual_urls || [],
    tenant_id: tenantId || null,
    correlation_id: correlationId || null,
  };

  const model = process.env.SEO_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";

  const hardConstraints = `
HARD CONSTRAINTS (must never violate):
- Never use the source URL (or any URL fragment) in the Product Name (H1), meta title, or body.
- Never output placeholder phrases like "Not specified", "N/A", "TBD", "Unknown", "Not provided".
- Product Specifications section is REQUIRED and must contain at least 1 real bullet derived from provided specs.
- Do NOT invent specs. Use only the specs provided in the input packet.
- The Product Name (H1) must be returned in seo.h1 and must NOT appear as an <h1> inside descriptionHtml.
- sections.overview must equal descriptionHtml exactly.
`.trim();

  const schemaHint = `
Return ONLY valid JSON with the following shape:
{
  "seo": { "h1": string, "title": string, "metaDescription": string, "shortDescription": string, "url": string },
  "descriptionHtml": string,
  "sections": {
    "overview": string,
    "hook": string,
    "mainDescription": string,
    "featuresBenefits": string,
    "specifications": string,
    "internalLinks": string,
    "whyChoose": string,
    "manuals": string|null,
    "faqs": string
  },
  "features": string[],
  "data_gaps": string[]
}
`.trim();

  const maxIterations = 3;
  let lockedH1: string | null = null;
  let lastError: string | null = null;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const revisionContext =
      iteration === 1
        ? ""
        : `
REVISION MODE:
- Keep seo.h1 exactly the same as previously approved: ${JSON.stringify(lockedH1)}
- Fix ONLY the violations listed below.
- Do not introduce new claims or new specs.
Violations to fix: ${JSON.stringify(lastError)}
`.trim();

    const userPrompt = `
${hardConstraints}

${schemaHint}

PRIMARY INSTRUCTIONS (authoritative):
${instructions}

INPUT FACTS PACKET (ground truth; do not output this as-is):
${JSON.stringify(factsPacket, null, 2)}

${revisionContext}
`.trim();

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "You are a strict JSON generator for product SEO content. Output must be valid JSON only.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const rawText = await resp.text();
    if (!resp.ok) {
      throw new Error(`central_gpt_seo_error: http_${resp.status}: ${rawText}`);
    }

    let parsed: any = null;
    try {
      const t = rawText.trim();
      const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonText = fenceMatch ? fenceMatch[1].trim() : t;
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("central_gpt_invalid_json");
    }

    try {
      // Lock H1 on first pass
      if (!lockedH1) {
        const h1 = parsed?.seo?.h1;
        if (typeof h1 === "string" && h1.trim() && !looksUrlDerivedName(h1)) {
          lockedH1 = h1.trim();
        }
      } else {
        if (parsed?.seo?.h1?.trim() !== lockedH1) {
          throw new Error("central_gpt_seo_error: h1_changed_in_revision");
        }
      }

      // Ensure url exists
      if (!parsed?.seo?.url || typeof parsed.seo.url !== "string" || !parsed.seo.url.trim()) {
        parsed.seo.url = `/${slugify(lockedH1 || parsed.seo.h1)}/`;
      } else {
        const u = String(parsed.seo.url).trim();
        parsed.seo.url = u.startsWith("/") ? (u.endsWith("/") ? u : `${u}/`) : `/${u}/`;
      }

      // Clamp (hard caps)
      parsed.seo.title = clampString(parsed.seo.title, 70);
      parsed.seo.metaDescription = clampString(parsed.seo.metaDescription, 160);

      validateOutputOrThrow(parsed);

      return {
        seo: parsed.seo,
        descriptionHtml: parsed.descriptionHtml,
        sections: parsed.sections,
        features: Array.isArray(parsed.features) ? parsed.features : [],
        data_gaps: Array.isArray(parsed.data_gaps) ? parsed.data_gaps : [],
        _meta: {
          model,
          instructionsSource,
          instructionsPath: resolvedPath,
          iterations: iteration,
        },
      };
    } catch (validationErr: any) {
      lastError = validationErr?.message || String(validationErr);

      if (iteration === maxIterations) {
        throw new Error(lastError.startsWith("central_gpt_") ? lastError : `central_gpt_seo_error: ${lastError}`);
      }

      continue;
    }
  }

  throw new Error("central_gpt_seo_error: exhausted_iterations");
}
