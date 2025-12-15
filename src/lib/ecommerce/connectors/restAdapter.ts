/**
 * Generic REST adapter used for other provider types.
 * Accepts a config that includes endpoint and paging strategy.
 * This is minimal; production adapters should include robust rate-limit and auth handling.
 */

export type NormalizedProduct = {
  sku?: string;
  title?: string;
  description?: string;
  price?: string;
  images?: string[];
  variants?: any[];
  raw?: any;
};

export function createRestAdapter(opts: { baseUrl: string; authHeader?: string }) {
  const { baseUrl, authHeader } = opts;
  async function* paginateProducts() {
    // Example single call; implement provider-specific paging
    const res = await fetch(baseUrl, { headers: authHeader ? { Authorization: authHeader } : {} as any });
    if (!res.ok) throw new Error(`REST adapter error ${res.status}`);
    const body = await res.json();
    const items = Array.isArray(body) ? body : body.items ?? [];
    for (const item of items) {
      yield { sku: item.sku ?? item.id, title: item.title ?? item.name, raw: item } as NormalizedProduct;
    }
  }
  return { paginateProducts };
}
