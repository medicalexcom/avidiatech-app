// src/lib/seo/compatSeoMapping.ts
// Small helper to map canonical seo result into a shape that includes legacy/top-level aliases
// so audit and other legacy consumers will find h1/title/metaDescription/shortDescription.
//
// Drop this file into the repo and import mapSeoResultToStore() where you persist seo_payload.

export function mapSeoResultToStore(seoResult: any) {
  // canonical nested object (preferred)
  const canonicalSeo = (seoResult && seoResult.seo) ? seoResult.seo : seoResult ?? {};

  // Helper to safely read possible locations (dot paths or arrays of path segments)
  const getFirst = (...paths: Array<string | string[] | undefined>) => {
    for (const p of paths) {
      if (!p) continue;
      if (typeof p === "string") {
        const parts = p.split(".");
        let cur: any = seoResult;
        for (const part of parts) {
          if (cur == null) { cur = undefined; break; }
          cur = cur[part];
        }
        if (cur !== undefined) return cur;
      } else if (Array.isArray(p)) {
        let cur: any = seoResult;
        for (const seg of p) {
          if (cur == null) { cur = undefined; break; }
          cur = cur[seg as string];
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
    h1: getFirst("seo.h1", "h1") ?? null,

    pageTitle:
      getFirst("seo.pageTitle", "seo.title", "pageTitle", "title") ?? null,

    title:
      getFirst("seo.title", "seo.pageTitle", "title", "pageTitle") ?? null,

    metaDescription:
      getFirst("seo.metaDescription", "seo.meta_description", "metaDescription", "meta_description") ?? null,

    meta_description:
      getFirst("seo.meta_description", "seo.metaDescription", "meta_description", "metaDescription") ?? null,

    shortDescription:
      getFirst("seo.shortDescription", "seo.seoShortDescription", "shortDescription", "seoShortDescription") ?? null,

    seoShortDescription:
      getFirst("seo.seoShortDescription", "seo.shortDescription", "seoShortDescription", "shortDescription") ?? null,
  };

  // Additional fallbacks: ensure both pageTitle and title exist
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
