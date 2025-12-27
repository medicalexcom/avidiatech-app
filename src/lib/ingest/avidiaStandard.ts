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

export function normalizeToAvidiaStandardFromCallback(args: {
  sourceUrl?: string | null;
  callbackBody: IngestCallbackBody;
}): {
  normalized: AvidiaStandardNormalizedPayload | null;
  issues: NormalizationIssue[];
  // helpful for debugging / diagnostics
  extracted: {
    nameCandidate?: string | null;
    brandCandidate?: string | null;
    specsCount: number;
    specSourcesUsed: string[];
  };
} {
  const { callbackBody } = args;

  // We may find fields in any of these buckets:
  const buckets: Array<{ label: string; obj: any }> = [
    { label: "normalized_payload", obj: callbackBody.normalized_payload },
    { label: "specs_payload", obj: callbackBody.specs_payload },
    { label: "manuals_payload", obj: callbackBody.manuals_payload },
    { label: "variants_payload", obj: callbackBody.variants_payload },
    { label: "raw_payload", obj: callbackBody.raw_payload },
  ].filter((b) => b.obj != null);

  const getFirst = (paths: string[]): any => {
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
        if (cur !== undefined && cur !== null) return cur;
      }
    }
    return undefined;
  };

  const issues: NormalizationIssue[] = [];

  // ----- Name / Brand -----
  const nameCandidateRaw =
    getFirst([
      "name_raw",
      "title",
      "product_name",
      "name",
      "productName",
      "h1",
      "seo.h1",
      "meta.title",
    ]) ?? null;

  const nameCandidate = toStringValue(nameCandidateRaw);

  if (!nameCandidate) {
    issues.push({
      field: "name",
      issue: "missing",
      fix_hint: "Ensure ingest callback includes a grounded name field (name_raw/title/name).",
    });
  } else if (looksUrlDerivedName(nameCandidate)) {
    issues.push({
      field: "name",
      issue: "url_derived_or_placeholder",
      fix_hint: "Engine provided url-derived name (e.g., 'Product for <url>'); must provide grounded name_raw/title.",
    });
  }

  const brandCandidateRaw =
    getFirst(["brand", "brand_raw", "brand_hint", "manufacturer", "make"]) ?? null;
  const brandCandidate = toStringValue(brandCandidateRaw);

  // ----- Specs merge -----
  const specsCanonical = coerceSpecsObject(getFirst(["specs"]) ?? null);
  const specsStructured = coerceSpecsObject(getFirst(["specs_structured", "specifications", "tech_specs"]) ?? null);
  const specsPdfArray = getFirst(["specs_pdf", "pdf_kv"]) ?? null;
  const specsPdf = coerceSpecsObject(specsPdfArray);

  const mergedSpecs: Record<string, string> = {};
  const specSourcesUsed: string[] = [];

  if (Object.keys(specsStructured).length) {
    mergeSpecs(mergedSpecs, specsStructured);
    specSourcesUsed.push("specs_structured/specifications/tech_specs");
  }
  if (Object.keys(specsCanonical).length) {
    mergeSpecs(mergedSpecs, specsCanonical);
    specSourcesUsed.push("specs");
  }
  if (Object.keys(specsPdf).length) {
    mergeSpecs(mergedSpecs, specsPdf);
    specSourcesUsed.push("specs_pdf/pdf_kv");
  }

  if (!Object.keys(mergedSpecs).length) {
    issues.push({
      field: "specs",
      issue: "empty",
      fix_hint:
        "No specs found in callback payload buckets. Ensure engine includes specs/specs_structured/specifications/specs_pdf/pdf_kv.",
    });
  }

  // ----- Other helpful fields for grounding -----
  const descriptionRaw = capString(getFirst(["description_raw", "sections.description", "description"]) ?? null, 20000);
  const featuresRaw = getFirst(["features_raw", "features_html", "features_structured"]) ?? null;
  const featuresArray: string[] | null =
    Array.isArray(featuresRaw) ? featuresRaw.map((x) => String(x)).filter(Boolean) : null;

  const pdfText = capString(getFirst(["pdf_text"]) ?? null, 20000);

  // If fatal issues, return null normalized (caller decides whether to persist)
  const fatal = issues.some((i) => i.field === "name" || i.field === "specs");

  if (fatal) {
    return {
      normalized: null,
      issues,
      extracted: {
        nameCandidate: nameCandidate ?? null,
        brandCandidate: brandCandidate ?? null,
        specsCount: Object.keys(mergedSpecs).length,
        specSourcesUsed,
      },
    };
  }

  const normalized: AvidiaStandardNormalizedPayload = {
    format: "avidia_standard",
    name: nameCandidate!,
    brand: brandCandidate ?? null,
    specs: mergedSpecs,

    name_raw: toStringValue(getFirst(["name_raw"]) ?? null),
    description_raw: descriptionRaw,
    features_raw: featuresArray,

    specs_structured: (getFirst(["specs_structured"]) as any) ?? null,
    specs_pdf: Array.isArray(specsPdfArray) ? specsPdfArray : null,
    pdf_text: pdfText,

    sku: toStringValue(getFirst(["sku"]) ?? null),
    images: Array.isArray(getFirst(["images"])) ? (getFirst(["images"]) as any) : null,
    pdf_manual_urls: Array.isArray(getFirst(["pdf_manual_urls"])) ? (getFirst(["pdf_manual_urls"]) as any) : null,
  };

  return {
    normalized,
    issues: [],
    extracted: {
      nameCandidate: nameCandidate ?? null,
      brandCandidate: brandCandidate ?? null,
      specsCount: Object.keys(mergedSpecs).length,
      specSourcesUsed,
    },
  };
}
