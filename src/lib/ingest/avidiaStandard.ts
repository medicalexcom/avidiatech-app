export type AvidiaStandardNormalizedPayload = {
  format: "avidia_standard";

  // Canonical fields used by downstream modules (SEO/Describe/Audit/Import)
  name: string; // grounded product name (NOT url-derived)
  brand: string | null;
  specs: Record<string, string>;

  // Optional grounding / provenance
  name_raw?: string | null;
  description_raw?: string | null;

  features_raw?: string[] | null;

  // Optional richer spec blocks (kept for debugging/grounding)
  specs_structured?: Record<string, any> | null;
  specs_pdf?: Array<{ key: string; value: string }> | null;
  pdf_text?: string | null;

  // Optional additional engine fields (if present)
  sku?: string | null;
  images?: Array<{ url: string }> | null;
  pdf_manual_urls?: string[] | null;
};

export type IngestCallbackBody = {
  ok?: boolean;
  job_id: string;
  ingestion_id?: string;
  status?: string; // completed|failed|processing|...
  error?: string | null;

  // Common engine payload buckets (may be present or null)
  raw_payload?: any;
  normalized_payload?: any;
  seo_payload?: any;
  specs_payload?: any;
  manuals_payload?: any;
  variants_payload?: any;

  diagnostics?: any;
};

export type NormalizationIssue = {
  field: string;
  issue: string;
  fix_hint?: string;
};

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function looksUrlDerivedName(name: string) {
  const s = name.toLowerCase();
  return (
    s.includes("http://") ||
    s.includes("https://") ||
    s.includes("www.") ||
    s.includes("product for ")
  );
}

function toStringValue(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s;
}

function capString(s: any, maxLen: number): string | null {
  const str = toStringValue(s);
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function coerceSpecsObject(input: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;

  // If already object: {key:value}
  if (typeof input === "object" && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input)) {
      const key = toStringValue(k);
      const val = toStringValue(v);
      if (!key || !val) continue;
      out[key] = val;
    }
    return out;
  }

  // If array: [{key,value}] or [{k:v}]
  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item) continue;

      if (typeof item === "object") {
        // {key:"x", value:"y"}
        const key = toStringValue((item as any).key);
        const val = toStringValue((item as any).value);
        if (key && val) {
          out[key] = val;
          continue;
        }

        // {someKey:"someValue"}
        const entries = Object.entries(item);
        if (entries.length === 1) {
          const [k, v] = entries[0];
          const kk = toStringValue(k);
          const vv = toStringValue(v);
          if (kk && vv) out[kk] = vv;
        }
      }
    }
    return out;
  }

  // Otherwise: ignore
  return out;
}

function mergeSpecs(into: Record<string, string>, from: Record<string, string>) {
  for (const [k, v] of Object.entries(from)) {
    const key = k.trim();
    const val = v.trim();
    if (!key || !val) continue;
    if (!(key in into)) into[key] = val;
  }
}

type Bucket = { label: string; obj: any };

function buildBuckets(callbackBody: IngestCallbackBody): Bucket[] {
  // We may find fields in any of these buckets, plus common nestings.
  const candidates: Bucket[] = [
    { label: "normalized_payload", obj: callbackBody.normalized_payload },
    { label: "specs_payload", obj: callbackBody.specs_payload },
    { label: "manuals_payload", obj: callbackBody.manuals_payload },
    { label: "variants_payload", obj: callbackBody.variants_payload },
    { label: "raw_payload", obj: callbackBody.raw_payload },
  ].filter((b) => b.obj != null);

  // Add helpful nested buckets to accommodate engine shapes:
  const nested: Bucket[] = [];

  for (const b of candidates) {
    const o = b.obj;
    if (!o || typeof o !== "object") continue;

    // Common wrappers: { data: {...} }, { product: {...} }, { result: {...} }
    for (const key of ["data", "product", "result", "payload"]) {
      if (o && typeof o === "object" && o[key] && typeof o[key] === "object") {
        nested.push({ label: `${b.label}.${key}`, obj: o[key] });
      }
    }

    // Some engines put the full scrape under raw_payload.scrape / raw_payload.page
    for (const key of ["scrape", "page", "document"]) {
      if (o && typeof o === "object" && o[key] && typeof o[key] === "object") {
        nested.push({ label: `${b.label}.${key}`, obj: o[key] });
      }
    }
  }

  return [...candidates, ...nested];
}

function getFirstFromBuckets(buckets: Bucket[], paths: string[]): { value: any; source: string | null; path: string | null } {
  for (const b of buckets) {
    const root = b.obj;
    for (const path of paths) {
      const parts = path.split(".");
      let cur: any = root;
      for (const p of parts) {
        if (!cur || typeof cur !== "object") {
          cur = undefined;
          break;
        }
        cur = cur[p];
      }
      if (cur !== undefined && cur !== null) {
        return { value: cur, source: b.label, path };
      }
    }
  }
  return { value: undefined, source: null, path: null };
}

export function normalizeToAvidiaStandardFromCallback(args: {
  sourceUrl?: string | null;
  callbackBody: IngestCallbackBody;
}): {
  normalized: AvidiaStandardNormalizedPayload | null;
  issues: NormalizationIssue[];
  // helpful for debugging / diagnostics
  extracted: {
    nameCandidate?: string | null;
    nameSource?: string | null;
    brandCandidate?: string | null;
    brandSource?: string | null;
    specsCount: number;
    specSourcesUsed: string[];
  };
} {
  const { callbackBody } = args;

  const buckets = buildBuckets(callbackBody);

  const pick = (paths: string[]) => getFirstFromBuckets(buckets, paths);

  const issues: NormalizationIssue[] = [];

  // ----- Name / Brand -----
  // IMPORTANT: prefer grounded raw scrape fields over normalized_payload.name
  const namePick = pick([
    // Raw scrape shapes (like your McKesson example)
    "name_raw",
    "product.name_raw",
    "data.name_raw",
    "product_name",
    "title",
    // HTML-derived fields some scrapers use
    "h1",
    "seo.h1",
    "meta.title",
    // fallback (may contain placeholder; we validate below)
    "name",
    "productName",
  ]);

  const nameCandidate = toStringValue(namePick.value);

  if (!nameCandidate) {
    issues.push({
      field: "name",
      issue: "missing",
      fix_hint: "Ensure ingest callback includes a grounded name field (name_raw/title/name).",
    });
  } else if (looksUrlDerivedName(nameCandidate)) {
    // Try to recover: if the best candidate looks placeholder, look specifically for name_raw/title in raw_payload
    const recovery = pick(["raw_payload.name_raw", "raw_payload.product.name_raw", "raw_payload.data.name_raw", "raw_payload.title"]);
    const recovered = toStringValue(recovery.value);
    if (recovered && !looksUrlDerivedName(recovered)) {
      // Use recovered, and do NOT add a fatal issue
    } else {
      issues.push({
        field: "name",
        issue: "url_derived_or_placeholder",
        fix_hint:
          "Engine provided url-derived name (e.g., 'Product for <url>'); must provide grounded name_raw/title.",
      });
    }
  }

  // Final name: if placeholder, only allow if recovered
  let finalName: string | null = null;
  if (nameCandidate && !looksUrlDerivedName(nameCandidate)) {
    finalName = nameCandidate;
  } else {
    const recovery = pick([
      "name_raw",
      "title",
      "product.name_raw",
      "data.name_raw",
      "raw_payload.name_raw",
      "raw_payload.title",
    ]);
    const recovered = toStringValue(recovery.value);
    if (recovered && !looksUrlDerivedName(recovered)) finalName = recovered;
  }

  const brandPick = pick([
    "brand",
    "brand_raw",
    "brand_hint",
    "manufacturer",
    "make",
    // McKesson example: manufacturer + brand appear in specs; we’ll derive later if needed
  ]);
  const brandCandidate = toStringValue(brandPick.value);

  // ----- Specs merge -----
  // Accept many shapes, including your McKesson example where specs are directly on raw_payload.specs
  const specsCanonicalPick = pick([
    "specs", // normalized_payload.specs OR raw_payload.specs
    "product.specs",
    "data.specs",
  ]);

  const specsStructuredPick = pick([
    "specs_structured",
    "specifications",
    "tech_specs",
    "product.specs_structured",
    "product.specifications",
    "data.specs_structured",
    "data.specifications",
  ]);

  const specsPdfArrayPick = pick([
    "specs_pdf",
    "pdf_kv",
    "pdf_manual_kv",
    "product.specs_pdf",
    "product.pdf_kv",
    "data.specs_pdf",
    "data.pdf_kv",
  ]);

  const specsCanonical = coerceSpecsObject(specsCanonicalPick.value ?? null);
  const specsStructured = coerceSpecsObject(specsStructuredPick.value ?? null);
  const specsPdfArray = specsPdfArrayPick.value ?? null;
  const specsPdf = coerceSpecsObject(specsPdfArray);

  const mergedSpecs: Record<string, string> = {};
  const specSourcesUsed: string[] = [];

  if (Object.keys(specsStructured).length) {
    mergeSpecs(mergedSpecs, specsStructured);
    specSourcesUsed.push(`${specsStructuredPick.source}:${specsStructuredPick.path}`);
  }
  if (Object.keys(specsCanonical).length) {
    mergeSpecs(mergedSpecs, specsCanonical);
    specSourcesUsed.push(`${specsCanonicalPick.source}:${specsCanonicalPick.path}`);
  }
  if (Object.keys(specsPdf).length) {
    mergeSpecs(mergedSpecs, specsPdf);
    specSourcesUsed.push(`${specsPdfArrayPick.source}:${specsPdfArrayPick.path}`);
  }

  if (!Object.keys(mergedSpecs).length) {
    issues.push({
      field: "specs",
      issue: "empty",
      fix_hint:
        "No specs found in callback payload buckets. Ensure engine includes specs/specs_structured/specifications/specs_pdf/pdf_kv.",
    });
  }

  // Derive brand if missing (common: specs has manufacturer/brand keys)
  let finalBrand: string | null = brandCandidate ?? null;
  if (!finalBrand) {
    for (const k of ["brand", "manufacturer", "make"]) {
      const v = mergedSpecs[k];
      if (isNonEmptyString(v)) {
        finalBrand = v.trim();
        break;
      }
    }
  }

  // ----- Other helpful fields for grounding -----
  const descriptionPick = pick([
    "description_raw",
    "product.description_raw",
    "data.description_raw",
    "description",
    "sections.description",
  ]);
  const descriptionRaw = capString(descriptionPick.value ?? null, 20000);

  const featuresPick = pick([
    "features_raw",
    "product.features_raw",
    "data.features_raw",
    "features_html",
    "features_structured",
    "features",
    "product.features",
    "data.features",
  ]);

  const featuresRaw = featuresPick.value ?? null;
  const featuresArray: string[] | null =
    Array.isArray(featuresRaw) ? featuresRaw.map((x) => String(x)).map((s) => s.trim()).filter(Boolean) : null;

  const pdfTextPick = pick(["pdf_text", "product.pdf_text", "data.pdf_text"]);
  const pdfText = capString(pdfTextPick.value ?? null, 20000);

  const skuPick = pick(["sku", "product.sku", "data.sku", "mpn", "product.mpn", "data.mpn"]);
  const sku = toStringValue(skuPick.value ?? null);

  const imagesPick = pick(["images", "product.images", "data.images"]);
  const images = Array.isArray(imagesPick.value) ? (imagesPick.value as any) : null;

  const pdfManualUrlsPick = pick(["pdf_manual_urls", "manual_urls", "product.pdf_manual_urls", "data.pdf_manual_urls"]);
  const pdfManualUrls = Array.isArray(pdfManualUrlsPick.value) ? (pdfManualUrlsPick.value as any) : null;

  // Fatal if name/specs missing or placeholder name not recoverable
  const fatal = issues.some((i) => i.field === "name" || i.field === "specs");

  if (fatal || !finalName) {
    return {
      normalized: null,
      issues,
      extracted: {
        nameCandidate: finalName ?? nameCandidate ?? null,
        nameSource: finalName ? (namePick.source ?? null) : null,
        brandCandidate: finalBrand ?? null,
        brandSource: brandPick.source ?? null,
        specsCount: Object.keys(mergedSpecs).length,
        specSourcesUsed,
      },
    };
  }

  // Provide provenance: prefer the actually used raw fields when possible
  const nameRawPick = pick(["name_raw", "product.name_raw", "data.name_raw"]);
  const nameRaw = capString(nameRawPick.value ?? null, 500);

  const normalized: AvidiaStandardNormalizedPayload = {
    format: "avidia_standard",
    name: finalName,
    brand: finalBrand ?? null,
    specs: mergedSpecs,

    name_raw: nameRaw,
    description_raw: descriptionRaw,
    features_raw: featuresArray,

    specs_structured: (specsStructuredPick.value as any) ?? null,
    specs_pdf: Array.isArray(specsPdfArray) ? (specsPdfArray as any) : null,
    pdf_text: pdfText,

    sku,
    images,
    pdf_manual_urls: pdfManualUrls,
  };

  return {
    normalized,
    issues: [],
    extracted: {
      nameCandidate: finalName,
      nameSource: namePick.source ?? null,
      brandCandidate: finalBrand ?? null,
      brandSource: brandPick.source ?? null,
      specsCount: Object.keys(mergedSpecs).length,
      specSourcesUsed,
    },
  };
}
