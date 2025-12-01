/**
 * SEO post-processing helpers
 *
 * Usage:
 *  import { applySeoPostprocessing } from "@/lib/seo/postprocess";
 *  const { seo_payload, description_html, features } = healed;
 *  const final = applySeoPostprocessing(seo_payload, description_html, features, { siteSuffix: " | MedicalEx" });
 *  // final.seo_payload, final.description_html returned
 */

type SeoPayload = { h1?: string; title?: string; metaDescription?: string; [k: string]: any };
type Options = {
  siteSuffix?: string; // appended to title (e.g., " | MedicalEx")
  metaTitleTargetMin?: number; // recommended core title length (without suffix)
  metaTitleHardCap?: number; // hard cap core title
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
  // trim to max then backtrack to space
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
  // naive removal of tags
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* Expand H1 by appending short grounded pieces (features or description fragments) until min length or exhausted */
function expandH1(h1: string, features: string[] = [], descriptionHtml = "", minLen = 90, maxLen = 110) {
  h1 = cleanText(h1 || "");
  const parts: string[] = h1 ? [h1] : [];

  // Prepare candidate expansions: features first (short), then first sentence of description
  const candidates: string[] = [];
  if (Array.isArray(features)) {
    for (const f of features) {
      if (typeof f === "string" && f.trim().length > 3 && candidates.length < 10) {
        candidates.push(f.replace(/\.$/, ""));
      }
    }
  }

  const descPlain = htmlToPlain(descriptionHtml || "");
  if (descPlain) {
    const firstSentence = descPlain.split(/[.?!]\s/)[0];
    if (firstSentence && firstSentence.length > 20) candidates.push(firstSentence);
  }

  // append candidates until minLen
  for (const c of candidates) {
    if ((parts.join(", ").length) >= minLen) break;
    parts.push(c);
  }

  let result = parts.join(", ");
  result = cleanText(result);

  // If still too short and empty, fallback to shorter site-suffixable name
  if (result.length < minLen) {
    // try repeating short descriptors (safe)
    const filler = (features && features[0]) ? ` ${features[0]}` : " Product";
    while (result.length < minLen && result.length + filler.length <= maxLen) {
      result = `${result}${filler}`;
    }
  }

  // Ensure not exceeding maxLen
  if (result.length > maxLen) {
    result = truncateToWordBoundary(result, maxLen);
  }

  return result;
}

/* Enforce meta title suffix and length limits */
function enforceMetaTitle(title: string | undefined, siteSuffix: string, hardCapCore: number = 68) {
  title = cleanText(title || "");
  const suffix = siteSuffix || "";
  // Remove any existing suffix variants (basic)
  const regexSuffix = new RegExp(`${escapeRegExp(suffix)}$`);
  if (regexSuffix.test(title)) {
    title = title.replace(regexSuffix, "").trim();
  }
  // Trim core to hard cap
  const core = truncateToWordBoundary(title, hardCapCore);
  let final = core;
  if (suffix) final = `${core}${suffix}`;
  return final;
}

function enforceMetaDescription(meta: string | undefined, descriptionHtml: string, targetMin = 150, targetMax = 160) {
  meta = cleanText(meta || "");
  if (meta.length >= targetMin && meta.length <= targetMax) return meta;
  // If meta missing or too short/long, derive from description
  const plain = htmlToPlain(descriptionHtml || "");
  if (!plain) return meta.slice(0, targetMax);
  // prefer first N chars up to targetMax and try not to cut mid-word
  let candidate = plain.slice(0, targetMax);
  candidate = truncateToWordBoundary(candidate, targetMax);
  // If shorter than min, try to extend slightly (up to targetMax)
  if (candidate.length < targetMin && plain.length > candidate.length) {
    const extra = plain.slice(candidate.length, targetMin);
    candidate = (candidate + " " + extra).slice(0, targetMax);
    candidate = truncateToWordBoundary(candidate, targetMax);
  }
  return candidate;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Main function to apply postprocessing to seo payload & description.
 * Returns object { seo_payload, description_html }
 */
export function applySeoPostprocessing(
  seo_payload: SeoPayload,
  description_html: string,
  features: string[] = [],
  opts?: Partial<Options>
) {
  const o = { ...defaultOptions, ...(opts || {}) };

  const payload: SeoPayload = { ...(seo_payload || {}) };

  // H1 handling
  const h1 = cleanText(payload.h1 || "");
  if (!h1 || h1.length < o.h1Min!) {
    payload.h1 = expandH1(h1, features, description_html, o.h1Min, o.h1Max);
  } else if (h1.length > o.h1Max!) {
    payload.h1 = truncateToWordBoundary(h1, o.h1Max!);
  }

  // Meta title handling - ensure suffix
  const title = payload.title || payload.h1 || "";
  payload.title = enforceMetaTitle(title, o.siteSuffix!, o.metaTitleHardCap);

  // metaDescription
  payload.metaDescription = enforceMetaDescription(payload.metaDescription, description_html, o.metaDescMin, o.metaDescMax);

  // Return adjusted values
  return {
    seo_payload: payload,
    description_html: description_html
  };
}
