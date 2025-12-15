/**
 * BigCommerce connector adapter (named export createBigCommerceAdapter).
 * Minimal skeleton — extend to handle images, variants, rate-limits, and auth refresh.
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

export function createBigCommerceAdapter(opts: { storeHash: string; accessToken: string }) {
  const { storeHash, accessToken } = opts;

  async function fetchPage(page = 1, limit = 50) {
    const url = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        "X-Auth-Token": accessToken,
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`BigCommerce API error ${res.status}`);
    const body = await res.json();
    return body;
  }

  async function* paginateProducts() {
    let page = 1;
    while (true) {
      const body = await fetchPage(page);
      const items = body?.data ?? [];
      if (!items || !items.length) break;

      for (const p of items) {
        const normalized: NormalizedProduct = {
          sku: p?.sku ?? p?.id?.toString?.(),
          title: p?.name,
          description: p?.description,
          price: p?.price?.toString?.() ?? undefined,
          images: [], // Optionally call images endpoint per product
          variants: p?.variants ?? [],
          raw: p,
        };
        yield normalized;
      }

      page += 1;
      // safety guard
      if (page > 10000) break;
    }
  }

  return { paginateProducts };
}
