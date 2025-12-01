/**
 * SEO post-processing helpers (updated to avoid duplicated H1/title fragments)
 *
 * Fixes applied:
 * - Strip site suffix from incoming title/H1 before expanding to avoid re-appending " | MedicalEx"
 * - Collapse repeated word sequences like "Product Product" → "Product"
 * - Avoid appending features that already appear in the H1
 * - If metaDescription equals title, derive a metaDescription from description_html instead
 *
 * Usage remains the same as before.
 */

type SeoPayload = { h1?: string; title?: string; metaDescription?: string; [k: string]: any };
type Options = {
  siteSuffix?: string;
  metaTitleTargetMin?: number;
  metaTitleHardCap?: number;
  metaDescMin?: number;
  metaDescMax?: number;
  h1Min?: number;
  h1Max?: number;
};

const defaultOptions: Options = {
  siteSuffix: " | MedicalEx",
  metaTitleTargetMin: 60,
  metaTitleHardCap: 68,
  metaDescMin: 150,
  metaDescMax: 160,
  h1Min: 90,
  h1Max: 110,
};

function truncateToWordBoundary(s: string, max: number) {
  if (!s) return s;
  if (s.length <= max) return s;
  const trimmed = s.slice(0, max);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.6)) {
    return trimmed.slice(0, lastSpace);
  }
  return trimmed;
}

function cleanText(s: string) {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

function htmlToPlain(s: string) {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function collapseDuplicateWords(s: string) {
  // collapse obvious immediate duplicates like "Product Product" or "Apple Apple" (case-insensitive)
  return s.replace(/\b([A-Za-z0-9]{2,})\b(?:\s+\1\b)+/gi, "$1");
}

function stripSuffix(s: string, suffix: string) {
  if (!s || !suffix) return s || "";
  const esc = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\s*${esc}\\s*$`, "i");
  return s.replace(re, "").trim();
}

/* Expand H1 by appending short grounded pieces (features or description fragments) until min length or exhausted */
function expandH1(h1Raw: string, features: string[] = [], descriptionHtml = "", minLen = 90, maxLen = 110, siteSuffix = "") {
  let h1 = cleanText(h1Raw || "");
  // Remove any site suffix already present
  if (siteSuffix) {
    h1 = stripSuffix(h1, siteSuffix);
  }

  // Collapse identical repeated words
  h1 = collapseDuplicateWords(h1);

  const parts: string[] = [];
  if (h1) parts.push(h1);

  // Build candidate expansions: features first (short), then first meaningful sentence of description
  const candidates: string[] = [];
  if (Array.isArray(features)) {
    for (const f of features) {
      if (typeof f === "string" && f.trim().length > 3 && candidates.length < 10) {
        const candidate = f.replace(/\.$/, "").trim();
        // skip if candidate already appears in base h1 (case-insensitive)
        if (candidate && !new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(h1)) {
          candidates.push(candidate);
        }
      }
    }
  }

  const descPlain = htmlToPlain(descriptionHtml || "");
  if (descPlain) {
    const firstSentence = descPlain.split(/[.?!]\s/)[0].trim();
    if (firstSentence && firstSentence.length > 20 && !new RegExp(`\\b${escapeRegExp(firstSentence.slice(0,40))}`, "i").test(h1)) {
      candidates.push(firstSentence);
    }
  }

  for (const c of candidates) {
    if ((parts.join(", ").length) >= minLen) break;
    // avoid appending exact duplicates
    if (!parts.join(" ").toLowerCase().includes(c.toLowerCase())) {
      parts.push(c);
    }
  }

  let result = parts.join(", ");
  result = cleanText(result);

  // If still too short and we have at least one feature, try safe short appends
  if (result.length < minLen) {
    const filler = (features && features[0]) ? ` ${features[0]}` : " Product";
    while (result.length < minLen && (result + filler).length <= maxLen) {
      if (!result.toLowerCase().includes(filler.trim().toLowerCase())) result = `${result}${filler}`;
      else break;
    }
  }

  // Ensure not exceeding maxLen
  if (result.length > maxLen) {
    result = truncateToWordBoundary(result, maxLen);
  }

  // Final cleanup: collapse any accidental repeated word sequences
  result = collapseDuplicateWords(result);

  return result;
}

function enforceMetaTitle(title: string | undefined, siteSuffix: string, hardCapCore: number = 68) {
  title = cleanText(title || "");
  // Remove existing suffix if present
  if (siteSuffix) {
    title = stripSuffix(title, siteSuffix);
  }
  const core = truncateToWordBoundary(title, hardCapCore);
  let final = core;
  if (siteSuffix) final = `${core}${siteSuffix}`;
  return cleanText(final);
}

function enforceMetaDescription(meta: string | undefined, descriptionHtml: string, targetMin = 150, targetMax = 160) {
  meta = cleanText(meta || "");
  const plain = htmlToPlain(descriptionHtml || "");
  // If meta is identical to title or empty, derive from description
  if (!meta || meta.length < 20 || meta === plain || meta.toLowerCase().includes(" | medicalex")) {
    if (!plain) return meta.slice(0, targetMax);
    let candidate = plain.slice(0, targetMax);
    candidate = truncateToWordBoundary(candidate, targetMax);
    if (candidate.length < targetMin && plain.length > candidate.length) {
      const extra = plain.slice(candidate.length, targetMin);
      candidate = (candidate + " " + extra).slice(0, targetMax);
      candidate = truncateToWordBoundary(candidate, targetMax);
    }
    return cleanText(candidate);
  }
  // if meta exists but too long, trim
  if (meta.length > targetMax) {
    return truncateToWordBoundary(meta, targetMax);
  }
  return meta;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Main function to apply postprocessing to seo payload & description.
 */
export function applySeoPostprocessing(
  seo_payload: SeoPayload,
  description_html: string,
  features: string[] = [],
  opts?: Partial<Options>
) {
  const o = { ...defaultOptions, ...(opts || {}) };

  const payload: SeoPayload = { ...(seo_payload || {}) };

  // Start with cleaned input values
  const incomingH1 = cleanText(payload.h1 || "");
  const incomingTitle = cleanText(payload.title || "");

  // Avoid expanding if incoming h1 already contains site suffix repeated or looks auto-generated
  // Expand only when h1 is very short (e.g., < 60 chars). This avoids overly long H1s when model already provided a long name.
  const h1LengthThresholdToExpand = Math.max(60, Math.floor(o.h1Min! * 0.6));

  if (!incomingH1 || incomingH1.length < h1LengthThresholdToExpand) {
    // Expand H1 safely
    payload.h1 = expandH1(incomingH1, features, description_html, o.h1Min!, o.h1Max!, o.siteSuffix || "");
  } else {
    // Ensure no site suffix or duplicate product words in h1 and trim to max
    let cleaned = incomingH1;
    if (o.siteSuffix) cleaned = stripSuffix(cleaned, o.siteSuffix);
    cleaned = collapseDuplicateWords(cleaned);
    if (cleaned.length > (o.h1Max || 110)) cleaned = truncateToWordBoundary(cleaned, o.h1Max || 110);
    payload.h1 = cleaned;
  }

  // Meta title: derive from payload.title or payload.h1; enforce suffix and caps
  const baseTitle = payload.title && payload.title.length > 0 ? payload.title : payload.h1 || "";
  payload.title = enforceMetaTitle(baseTitle, o.siteSuffix || "", o.metaTitleHardCap);

  // Meta description: ensure it isn't equal to the title and is derived from description when needed
  payload.metaDescription = enforceMetaDescription(payload.metaDescription, description_html, o.metaDescMin, o.metaDescMax);

  // Final cleanup: collapse duplicates (e.g., "Product Product")
  payload.h1 = collapseDuplicateWords(payload.h1 || "");
  payload.title = collapseDuplicateWords(payload.title || "");
  payload.metaDescription = collapseDuplicateWords(payload.metaDescription || "");

  return {
    seo_payload: payload,
    description_html: description_html
  };
}
