/**
 * Minimal Shopify connector adapter.
 * - Exports a factory that accepts integration config/credentials and returns an object with:
 *   - async *paginateProducts() => async iterator of normalized product objects
 *
 * NOTE: This is a safe skeleton; you must supply real API calls and handle rate-limits and auth.
 */

import fetch from "node-fetch";

export type NormalizedProduct = {
  sku?: string;
  title?: string;
  description?: string;
  price?: string;
  images?: string[];
  variants?: any[];
  raw?: any;
};

export function createShopifyAdapter(opts: { shopDomain: string; accessToken: string }) {
  const { shopDomain, accessToken } = opts;

  async function fetchPage(cursor?: string) {
    // Example GraphQL request or REST product listing
    // This skeleton uses REST products.json pagination (page_info or since_id depending on API)
    const url = `https://${shopDomain}/admin/api/2024-01/products.json?limit=50${cursor ? `&page_info=${cursor}` : ""}`;
    const res = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`Shopify API error ${res.status}`);
    const body = await res.json();
    return body;
  }

  async function* paginateProducts() {
    // Skeleton: make a single request and yield normalized results
    const body = await fetchPage();
    const items = body.products ?? [];
    for (const p of items) {
      const normalized: NormalizedProduct = {
        sku: p?.variants?.[0]?.sku ?? p?.id?.toString(),
        title: p?.title,
        description: p?.body_html,
        price: p?.variants?.[0]?.price,
        images: (p?.images || []).map((i: any) => i.src),
        variants: p?.variants,
        raw: p,
      };
      yield normalized;
    }
    // Note: implement cursor-based pagination for full syncs
  }

  return { paginateProducts };
}
