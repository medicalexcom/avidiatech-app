import { isSafePublicUrl, domainOf, allowlistedDomainsForSupplier } from "./netSafety";
import { fetchWithTimeout } from "./http";
import { normalizeSku, normalizeNdcItemCode, normalizeProductName } from "./normalize";

export async function verifyCandidateUrl(input: any, candidateUrl: string) {
  const signals: string[] = [];
  if (!isSafePublicUrl(candidateUrl)) return { ok: false, score: 0, signals: ["unsafe_url"] };

  const allowlist = allowlistedDomainsForSupplier(input.supplierKey || "");
  const dom = domainOf(candidateUrl);
  if (allowlist.length && !allowlist.includes(dom)) return { ok: false, score: 0, signals: ["not_in_allowlist"] };

  try {
    const resp = await fetchWithTimeout(candidateUrl, { timeoutMs: 10_000 });
    const text = (resp && resp.text) ? resp.text : String(resp?.text ?? "");
    const body = text.toString().toLowerCase();

    let score = 0;
    // SKU evidence
    const sku = (input.sku || "").toString().toLowerCase();
    const skuNorm = normalizeSku(input.skuNorm || input.sku || "");
    if (sku && body.includes(sku)) { score += 0.35; signals.push("sku_found"); }
    if (skuNorm && body.includes(skuNorm)) { score += 0.35; if (!signals.includes("sku_found")) signals.push("sku_norm_found"); }

    // NDC evidence
    const ndc = normalizeNdcItemCode(input.ndcItemCodeNorm || input.ndcItemCode || "");
    if (ndc && body.includes(ndc.toLowerCase())) { score += 0.35; signals.push("ndc_found"); }

    // product name tokens overlap
    const name = normalizeProductName(input.productName || input.productNameNorm || "");
    if (name) {
      const tokens = name.split(/\s+/).filter(Boolean).slice(0, 8);
      let hits = 0;
      for (const t of tokens) if (t.length > 2 && body.includes(t)) hits++;
      const tokenScore = Math.min(1, hits / Math.max(1, tokens.length)) * 0.2;
      if (tokenScore > 0) { score += tokenScore; signals.push("name_tokens"); }
    }

    // brand
    const brand = (input.brandName || "").toLowerCase();
    if (brand && body.includes(brand)) { score += 0.1; signals.push("brand_found"); }

    // Detect search/listing pages by presence of "search" or multiple product links heuristics
    const isSearchPage = /<input[^>]*name=["']?q|search results|category|product-listing/i.test(text as string);
    if (isSearchPage && score < 0.75) {
      // penalize
      signals.push("search_page");
      score = Math.max(0, score - 0.15);
    }

    const ok = score >= 0.75;
    const needsReview = !ok && score >= 0.55;
    return { ok: ok, score, signals, extracted: { domain: domainOf(candidateUrl), bodySnippet: (body as string).slice(0, 300) }, needsReview };
  } catch (err:any) {
    return { ok: false, score: 0, signals: ["fetch_error"], error: String(err?.message ?? err) };
  }
}
