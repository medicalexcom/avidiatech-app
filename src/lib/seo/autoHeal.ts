type HealOptions = { strict?: boolean };

function truncate(s: string | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() : s.trim();
}

function dedupeArray(arr: string[]) {
  const seen = new Set<string>();
  return arr.filter((v) => {
    const key = v.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function autoHeal(descriptionHtml: string, seoPayload: any, features: string[], opts: HealOptions = { strict: true }) {
  const log: any = { appliedRules: [], notes: [] };

  // sanitize and enforce caps
  const healedSeo: any = { ...seoPayload };
  healedSeo.h1 = truncate(healedSeo.h1, 70);
  healedSeo.title = truncate(healedSeo.title, 60);
  healedSeo.metaDescription = truncate(healedSeo.metaDescription, 160);
  if (healedSeo.h1 !== seoPayload.h1) log.appliedRules.push("h1_truncated");
  if (healedSeo.title !== seoPayload.title) log.appliedRules.push("title_truncated");
  if (healedSeo.metaDescription !== seoPayload.metaDescription) log.appliedRules.push("meta_truncated");

  // dedupe and trim features
  const healedFeatures = dedupeArray((features || []).map((f) => (typeof f === "string" ? f.trim() : String(f))));
  if (healedFeatures.length !== (features || []).length) log.appliedRules.push("features_deduped");

  // basic banned-phrases filter (expandable)
  const banned = ["buy now", "click here", "free download"];
  const cleanedHtml = banned.reduce((acc, b) => acc.replace(new RegExp(b, "gi"), ""), (descriptionHtml || "").trim());
  if (cleanedHtml !== (descriptionHtml || "").trim()) log.appliedRules.push("banned_phrases_removed");

  // minimal HTML normalization: ensure content exists
  const finalHtml = cleanedHtml || `<p>${healedSeo.shortDescription || healedSeo.title || healedSeo.h1 || "Product overview"}</p>`;

  return { html: finalHtml, seo: healedSeo, features: healedFeatures, log };
}
