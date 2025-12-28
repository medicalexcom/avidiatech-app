// src/lib/seo/compatSeoMapping.ts
// Small helper to map canonical seo result into a shape that includes legacy/top-level aliases
// so audit and other legacy consumers will find h1/title/metaDescription/shortDescription.

export function mapSeoResultToStore(seoResult: any) {
  // canonical nested object (preferred)
  const canonicalSeo = (seoResult && seoResult.seo) ? seoResult.seo : seoResult ?? {};

  const get = (...paths: Array<string | (string | number)[]>) => {
    for (const p of paths) {
      if (!p) continue;
      if (typeof p === "string") {
        // single path string may be dot-delimited
        const parts = (p as string).split(".");
        let cur: any = seoResult;
        for (const part of parts) {
          if (cur == null) { cur = undefined; break; }
          cur = cur[part];
        }
        if (cur !== undefined) return cur;
      } else if (Array.isArray(p)) {
        // array of keys: try sequentially
        let cur = seoResult;
        for (const key of p) {
          if (cur == null) { cur = undefined; break; }
          cur = cur[key as string];
        }
        if (cur !== undefined) return cur;
      }
    }
    return undefined;
  };

  // Build the payload that will be persisted in product_ingestions.seo_payload
  const seo_payload_to_store: any = {
    // preserve canonical structure
    ...seoResult,
    seo: canonicalSeo,
    // ensure debug/meta present
    _meta: seoResult?._meta ?? null,
    // legacy / top-level compatibility (prefer canonical values)
    h1: canonicalSeo?.h1 ?? seoResult?.h1 ?? null,
    pageTitle:
      canonicalSeo?.pageTitle ??
      canonicalSeo?.title ??
      seoResult?.pageTitle ??
      seoResult?.title ??
      null,
    title:
      canonicalSeo?.title ??
      canonicalSeo?.pageTitle ??
      seoResult?.title ??
      seoResult?.pageTitle ??
      null,
    metaDescription:
      canonicalSeo?.metaDescription ??
      canonicalSeo?.meta_description ??
      seoResult?.metaDescription ??
      seoResult?.meta_description ??
      null,
    meta_description:
      canonicalSeo?.meta_description ??
      canonicalSeo?.metaDescription ??
      seoResult?.meta_description ??
      seoResult?.metaDescription ??
      null,
    shortDescription:
      canonicalSeo?.shortDescription ??
      canonicalSeo?.seoShortDescription ??
      seoResult?.shortDescription ??
      seoResult?.seoShortDescription ??
      null,
    seoShortDescription:
      canonicalSeo?.seoShortDescription ??
      canonicalSeo?.shortDescription ??
      seoResult?.seoShortDescription ??
      seoResult?.shortDescription ??
      null,
  };

  // Also provide backward-compatible fallback names that some code may check
  // (pageTitle vs. title, meta vs metaDescription)
  if (!seo_payload_to_store.pageTitle && seo_payload_to_store.title) {
    seo_payload_to_store.pageTitle = seo_payload_to_store.title;
  }
  if (!seo_payload_to_store.title && seo_payload_to_store.pageTitle) {
    seo_payload_to_store.title = seo_payload_to_store.pageTitle;
  }
  if (!seo_payload_to_store.metaDescription && seo_payload_to_store.meta_description) {
    seo_payload_to_store.metaDescription = seo_payload_to_store.meta_description;
  }
  if (!seo_payload_to_store.meta_description && seo_payload_to_store.metaDescription) {
    seo_payload_to_store.meta_description = seo_payload_to_store.metaDescription;
  }

  return seo_payload_to_store;
}
