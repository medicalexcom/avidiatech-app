import { isSafePublicUrl, domainOf, allowlistedDomainsForSupplier } from "./netSafety";
import { fetchWithTimeout } from "./http";
import { normalizeSku, normalizeNdcItemCode, normalizeProductName } from "./normalize";
import { canonicalizeUrl, pathLooksLikeDownload } from "./url";

function isHtmlContentType(ct: string | null | undefined) {
  const v = (ct || "").toLowerCase();
  if (!v) return true; // some servers omit it
  return v.includes("text/html") || v.includes("application/xhtml") || v.includes("application/xml");
}

function isObviouslyNotAProductPage(candidateUrl: string) {
  try {
    const u = new URL(candidateUrl);
    const p = (u.pathname || "").toLowerCase();

    // Downloads / files
    if (pathLooksLikeDownload(u.pathname)) return { yes: true, reason: "download_path" };

    // Very common "non product" routes
    if (p === "/" || p === "") return { yes: true, reason: "homepage" };
    if (p.startsWith("/catalogsearch/")) return { yes: true, reason: "search_page_path" };
    if (p.startsWith("/products")) return { yes: true, reason: "listing_page_path" };

    return { yes: false as const, reason: "" };
  } catch {
    return { yes: true, reason: "invalid_url" };
  }
}

export async function verifyCandidateUrl(input: any, candidateUrl: string) {
  const signals: string[] = [];

  let canonUrl = candidateUrl;
  try {
    canonUrl = canonicalizeUrl(candidateUrl);
  } catch {
    // keep original
  }

  if (!isSafePublicUrl(canonUrl)) return { ok: false, score: 0, signals: ["unsafe_url"] };

  const allowlist = allowlistedDomainsForSupplier(input.supplierKey || "");
  const dom = domainOf(canonUrl);
  if (allowlist.length && !allowlist.includes(dom)) return { ok: false, score: 0, signals: ["not_in_allowlist"] };

  // Hard reject obvious non-product URLs (prevents PH /amfile/ false "confident")
  const nonProduct = isObviouslyNotAProductPage(canonUrl);
  if (nonProduct.yes) return { ok: false, score: 0, signals: [nonProduct.reason] };

  try {
    const resp = await fetchWithTimeout(canonUrl, { timeoutMs: 10_000 });

    // If we got a non-HTML response, reject (prevents PDFs/downloads).
    if (!isHtmlContentType(resp?.contentType)) {
      return { ok: false, score: 0, signals: ["non_html_content_type", String(resp?.contentType ?? "")] };
    }

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

    // product name tokens overlap (more important for sites where SKU isn't in URL)
    const name = normalizeProductName(input.productName || input.productNameNorm || "");
    if (name) {
      const tokens = name.split(/\s+/).filter(Boolean).slice(0, 10);
      let hits = 0;
      for (const t of tokens) if (t.length > 2 && body.includes(t)) hits++;
      const tokenScore = Math.min(1, hits / Math.max(1, tokens.length)) * 0.25;
      if (tokenScore > 0) { score += tokenScore; signals.push("name_tokens"); }
    }

    // brand
    const brand = (input.brandName || "").toLowerCase();
    if (brand && body.includes(brand)) { score += 0.1; signals.push("brand_found"); }

    // Detect search/listing pages by presence of search UI
    const isSearchPage = /<input[^>]*name=["']?q|search results|category|product-listing/i.test(text as string);
    if (isSearchPage && score < 0.75) {
      signals.push("search_page");
      score = Math.max(0, score - 0.2);
    }

    const ok = score >= 0.75;
    const needsReview = !ok && score >= 0.55;

    return {
      ok,
      score,
      signals,
      extracted: { domain: domainOf(canonUrl), bodySnippet: (body as string).slice(0, 300), canonical_url: canonUrl },
      needsReview
    };
  } catch (err: any) {
    return { ok: false, score: 0, signals: ["fetch_error"], error: String(err?.message ?? err) };
  }
}
