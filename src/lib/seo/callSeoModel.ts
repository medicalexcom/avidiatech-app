import { loadCustomGptInstructionsWithInfo } from "@/lib/centralGpt";
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
  // simple heuristic: count <li> occurrences inside specs section html
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
  // Top-level required
  if (!out || typeof out !== "object") {
    throw new Error("central_gpt_invalid_json");
  }

  if (!out.seo || typeof out.seo !== "object") {
    throw new Error("central_gpt_seo_error: missing seo object");
  }

  requireNonEmptyString(out.seo.h1, "seo.h1");
  requireNonEmptyString(out.seo.title, "seo.title");
  requireNonEmptyString(out.seo.metaDescription, "seo.metaDescription");
  requireNonEmptyString(out.descriptionHtml, "descriptionHtml");

  // H1 must not be url-derived
  if (looksUrlDerivedName(out.seo.h1)) {
    throw new Error("central_gpt_seo_error: invalid_h1_contains_url_or_placeholder");
  }

  // placeholders forbidden anywhere in customer-facing HTML
  const htmlAggregate =
    String(out.descriptionHtml || "") +
    "\n" +
    JSON.stringify(out.sections || {}) +
    "\n" +
    JSON.stringify(out.seo || {});

  const bad = containsBannedTokens(htmlAggregate);
  if (bad) {
    throw new Error(`central_gpt_seo_error: banned_placeholder_token:${bad}`);
  }

  // specs section required and must include bullets
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

  // overview must equal full html (your existing contract)
  if (typeof out.sections.overview === "string" && out.sections.overview.trim()) {
    if (out.sections.overview.trim() !== String(out.descriptionHtml || "").trim()) {
      throw new Error("central_gpt_seo_error: sections.overview_must_equal_descriptionHtml");
    }
  }
}

/**
 * callSeoModel
 *
 * Implements the custom_gpt_instructions contract at the enforcement layer:
 * - No placeholder tokens
 * - No url-derived names
 * - Product Specifications section required and must have real bullets
 * - 1 draft + up to 2 auto-revise passes (max 3 iterations)
 */
export async function callSeoModel(
  normalized: AvidiaStandardNormalizedPayload,
  correlationId: string | null,
  sourceUrl: string | null,
  tenantId: string | null
): Promise<SeoResult> {
  // Minimal config check
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.CENTRAL_GPT_API_KEY ||
    "";

  if (!apiKey) {
    throw new Error("central_gpt_not_configured: missing OPENAI_API_KEY");
  }

  // Load instruction file (priority)
  const { instructions, source } = await loadCustomGptInstructionsWithInfo();

  // Build factual packet (strict grounding)
  const productName = normalized.name;
  const brand = normalized.brand || null;
  const specs = normalized.specs || {};
  const features = normalized.features_raw || [];

  // Additional grounding (optional, capped already in normalization)
  const pdfText = normalized.pdf_text || null;
  const descriptionRaw = normalized.description_raw || null;

  // This is what the GPT sees as the "truth"
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

  // Model + endpoint
  const model = process.env.SEO_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";

  // ---- prompt wrapper ----
  // We keep your instruction doc as the primary rules, but we add hard constraints to avoid regressions.
  const hardConstraints = `
HARD CONSTRAINTS (must never violate):
- Never use the source URL (or any URL fragment) in the Product Name (H1), meta title, or body.
- Never output placeholder phrases like "Not specified", "N/A", "TBD", "Unknown", "Not provided".
- Product Specifications section is REQUIRED and must contain at least 1 real bullet derived from provided specs.
- Do NOT invent specs. Use only the specs provided in the input packet.
- The Product Name (H1) must be returned in seo.h1 and must NOT appear as an <h1> inside descriptionHtml.
- sections.overview must equal descriptionHtml exactly.
`;

  // We use a strict JSON-only response to keep current pipeline stable.
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
`;

  // ---- iterative draft -> audit -> revise loop ----
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
`;

    const userPrompt = `
${hardConstraints}

${schemaHint}

PRIMARY INSTRUCTIONS:
${instructions}

INPUT FACTS PACKET (ground truth; do not output this as-is):
${JSON.stringify(factsPacket, null, 2)}

${revisionContext}
`.trim();

    // call OpenAI chat completions
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
            content:
              "You are a strict JSON generator for product SEO content. Output must be valid JSON only.",
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
      const jsonText = (() => {
        // tolerate accidental markdown fences
        const t = rawText.trim();
        const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        return fenceMatch ? fenceMatch[1].trim() : t;
      })();

      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error("central_gpt_invalid_json");
    }

    try {
      // Lock H1 on first successful parse
      if (!lockedH1) {
        const h1 = parsed?.seo?.h1;
        if (typeof h1 === "string" && h1.trim() && !looksUrlDerivedName(h1)) {
          lockedH1 = h1.trim();
        }
      } else {
        // enforce lock (also causes revision if model changed it)
        if (parsed?.seo?.h1?.trim() !== lockedH1) {
          throw new Error("central_gpt_seo_error: h1_changed_in_revision");
        }
      }

      // Ensure url field is present and reasonable; if missing, compute from H1 (safe)
      if (!parsed?.seo?.url || typeof parsed.seo.url !== "string" || !parsed.seo.url.trim()) {
        parsed.seo.url = `/${slugify(lockedH1 || parsed.seo.h1)}/`;
      } else {
        // normalize url formatting
        const u = String(parsed.seo.url).trim();
        parsed.seo.url = u.startsWith("/") ? (u.endsWith("/") ? u : `${u}/`) : `/${u}/`;
      }

      // Clamp lengths (hard caps; still prefer model compliance)
      parsed.seo.title = clampString(parsed.seo.title, 70);
      parsed.seo.metaDescription = clampString(parsed.seo.metaDescription, 160);

      // Validate strict requirements
      validateOutputOrThrow(parsed);

      // return in your canonical structure
      return {
        seo: parsed.seo,
        descriptionHtml: parsed.descriptionHtml,
        sections: parsed.sections,
        features: Array.isArray(parsed.features) ? parsed.features : [],
        data_gaps: Array.isArray(parsed.data_gaps) ? parsed.data_gaps : [],
        _meta: {
          model,
          instructionsSource: source,
          iterations: iteration,
        },
      };
    } catch (validationErr: any) {
      lastError = validationErr?.message || String(validationErr);

      // If we're at final iteration, throw
      if (iteration === maxIterations) {
        throw new Error(lastError.startsWith("central_gpt_") ? lastError : `central_gpt_seo_error: ${lastError}`);
      }

      // Otherwise retry revision pass
      continue;
    }
  }

  throw new Error("central_gpt_seo_error: exhausted_iterations");
}
