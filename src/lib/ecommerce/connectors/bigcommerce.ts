/* src/lib/ecommerce/connectors/bigcommerce.ts
 *
 * BigCommerce connector helpers
 *
 * This file was extended to make importToBigCommerce more robust:
 * - It now returns structured error information instead of throwing for 4xx/5xx API responses.
 * - The returned BigCommerceImportResult includes ok:false and an `error` / `reason` field with
 *   the remote response body and status when an upstream API call fails (useful to persist in diagnostics).
 *
 * Note: callers (runImportForIngestion) already expect result.ok and persist diagnostics.result,
 * so switching from throws -> structured result makes import failures visible without bubbling exceptions.
 */

import { safeFetch } from "@/lib/utils/safeFetch";

/* Types */

export type BigCommerceCredentials = {
  // Accept both snake_case and camelCase keys for flexibility
  store_hash?: string;
  storeHash?: string;
  access_token?: string;
  accessToken?: string;
};

export type BigCommerceUpsertOptions = {
  allowOverwriteExisting?: boolean; // default false (safe)
};

export type BigCommerceImportResult = {
  ok: boolean;
  platform: "bigcommerce";
  action: "created" | "needs_review" | "updated" | "failed";
  product_id?: number;
  sku?: string | null;
  warnings: string[];
  needs_review?: boolean;
  reason?: string;
  error?: any; // structured error details from BigCommerce or internal diagnostics
};

function bcBaseUrl(storeHash: string) {
  return `https://api.bigcommerce.com/stores/${storeHash}/v3`;
}

function headers(token: string) {
  return {
    "content-type": "application/json",
    "x-auth-token": token,
    accept: "application/json",
  };
}

/* Helpers */

export function extractSkuFromIngestion(row: any): string | null {
  const normalized = row?.normalized_payload ?? {};
  const candidates = [
    normalized?.sku,
    normalized?.mpn,
    normalized?.part_number,
    normalized?.specs?.sku,
    normalized?.specs?.mpn,
    // fallback to top-level fields if ingestion normalized payload is missing
    row?.sku,
    row?.mpn,
  ];

  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return null;
}

export async function findProductBySku(args: { creds: BigCommerceCredentials; sku: string }) {
  const storeHash = (args.creds.storeHash ?? args.creds.store_hash) as string;
  const token = (args.creds.accessToken ?? args.creds.access_token) as string;
  if (!storeHash || !token) throw new Error("bigcommerce_missing_credentials");

  const url = `${bcBaseUrl(storeHash)}/catalog/products?keyword=${encodeURIComponent(args.sku)}&limit=50`;

  const res = await safeFetch(url, {
    method: "GET",
    headers: headers(token),
    timeoutMs: 12_000,
  });

  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`bigcommerce_search_failed:${res.status}:${text}`);
  }

  const data = json?.data ?? [];
  const exact = data.find((p: any) => {
    const topSku = String(p?.sku ?? "").trim();
    if (topSku) return topSku === args.sku;
    if (Array.isArray(p?.variants)) {
      return p.variants.some((v: any) => String(v?.sku ?? "").trim() === args.sku);
    }
    return false;
  });
  return exact ?? null;
}

export function buildProductPayloadFromIngestion(row: any, sku: string | null) {
  const normalized = row?.normalized_payload ?? {};
  const seo = row?.seo_payload ?? {};
  const description_html = row?.description_html ?? null;

  const name =
    typeof normalized?.name === "string" && normalized.name.trim()
      ? normalized.name.trim()
      : typeof seo?.h1 === "string" && seo.h1.trim()
      ? seo.h1.trim()
      : "New Product";

  const payload: any = {
    name,
    type: "physical",
    weight: 1,
    description: typeof description_html === "string" ? description_html : "",
    sku: sku || undefined,
    is_visible: false, // safe default: keep hidden until reviewed
    custom_fields: [
      { name: "Avidia Ingestion ID", value: String(row?.id ?? "") },
      { name: "Avidia Source URL", value: String(row?.source_url ?? "") },
    ].filter((x) => x.value),
  };

  if (typeof seo?.pageTitle === "string" && seo.pageTitle.trim()) payload.page_title = seo.pageTitle.trim();
  if (typeof seo?.metaDescription === "string" && seo.metaDescription.trim()) payload.meta_description = seo.metaDescription.trim();

  return payload;
}

/**
 * importToBigCommerce
 *
 * - Tries to find an existing product by SKU
 * - If found and allowOverwriteExisting=false -> returns needs_review
 * - If found and allowOverwriteExisting=true -> attempts to update and returns result (structured)
 * - Otherwise creates a product and returns result (structured)
 *
 * Important: For non-2xx BigCommerce responses we DO NOT throw; instead we return ok:false with
 * structured error details so callers can persist diagnostics and surface helpful messages in the UI.
 */
export async function importToBigCommerce(args: {
  creds: BigCommerceCredentials;
  ingestionRow: any;
  opts?: BigCommerceUpsertOptions;
}): Promise<BigCommerceImportResult> {
  const storeHash = (args.creds.storeHash ?? args.creds.store_hash) as string;
  const token = (args.creds.accessToken ?? args.creds.access_token) as string;
  if (!storeHash || !token) throw new Error("bigcommerce_missing_credentials");

  const sku = extractSkuFromIngestion(args.ingestionRow);
  const warnings: string[] = [];
  const allowOverwriteExisting = Boolean(args.opts?.allowOverwriteExisting);

  if (!sku) warnings.push("missing_sku");

  let existing: any = null;
  if (sku) {
    try {
      existing = await findProductBySku({ creds: args.creds, sku });
    } catch (e: any) {
      warnings.push("search_failed");
    }
  }

  if (existing && !allowOverwriteExisting) {
    return {
      ok: true,
      platform: "bigcommerce",
      action: "needs_review",
      product_id: existing.id,
      sku,
      warnings,
      needs_review: true,
      reason: "sku_exists_requires_manual_overwrite",
    };
  }

  if (existing && allowOverwriteExisting) {
    const updateUrl = `${bcBaseUrl(storeHash)}/catalog/products/${existing.id}`;
    const updatePayload = buildProductPayloadFromIngestion(args.ingestionRow, sku);

    try {
      const res = await safeFetch(updateUrl, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(updatePayload),
        timeoutMs: 15_000,
      });

      const text = await res.text().catch(() => "");
      const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

      if (!res.ok) {
        // return structured failure instead of throwing
        return {
          ok: false,
          platform: "bigcommerce",
          action: "failed",
          product_id: existing.id,
          sku,
          warnings,
          reason: `bigcommerce_update_failed:${res.status}`,
          error: { status: res.status, body },
        };
      }

      const updated = body?.data ?? null;
      return {
        ok: true,
        platform: "bigcommerce",
        action: "updated",
        product_id: updated?.id ?? existing.id,
        sku,
        warnings,
      };
    } catch (e: any) {
      return {
        ok: false,
        platform: "bigcommerce",
        action: "failed",
        sku,
        warnings,
        reason: "bigcommerce_update_exception",
        error: { message: String(e?.message ?? e) },
      };
    }
  }

  // Create new product
  const createUrl = `${bcBaseUrl(storeHash)}/catalog/products`;
  const createPayload = buildProductPayloadFromIngestion(args.ingestionRow, sku);

  try {
    const res = await safeFetch(createUrl, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(createPayload),
      timeoutMs: 15_000,
    });

    const text = await res.text().catch(() => "");
    const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

    if (!res.ok) {
      return {
        ok: false,
        platform: "bigcommerce",
        action: "failed",
        sku,
        warnings,
        reason: `bigcommerce_create_failed:${res.status}`,
        error: { status: res.status, body },
      };
    }

    const created = body?.data ?? null;

    return {
      ok: true,
      platform: "bigcommerce",
      action: "created",
      product_id: created?.id ?? undefined,
      sku,
      warnings,
    };
  } catch (e: any) {
    return {
      ok: false,
      platform: "bigcommerce",
      action: "failed",
      sku,
      warnings,
      reason: "bigcommerce_create_exception",
      error: { message: String(e?.message ?? e) },
    };
  }
}

export type NormalizedProduct = {
  sku?: string;
  title?: string;
  description?: string;
  price?: string;
  images?: string[];
  variants?: any[];
  raw?: any;
};

export function createBigCommerceAdapter(opts: { storeHash?: string; accessToken?: string; store_hash?: string; access_token?: string }) {
  const storeHash = (opts.storeHash ?? opts.store_hash) as string;
  const accessToken = (opts.accessToken ?? opts.access_token) as string;
  if (!storeHash || !accessToken) {
    throw new Error("bigcommerce_adapter_missing_credentials");
  }

  async function fetchPage(page = 1, limit = 50) {
    const url = `${bcBaseUrl(storeHash)}/catalog/products?page=${page}&limit=${limit}`;
    const res = await safeFetch(url, {
      method: "GET",
      headers: headers(accessToken),
      timeoutMs: 15000,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BigCommerce API error ${res.status}: ${text}`);
    }
    const text = await res.text().catch(() => "");
    const json = text ? JSON.parse(text) : null;
    return json;
  }

  async function* paginateProducts(pageSize = 50) {
    let page = 1;
    while (true) {
      const body = await fetchPage(page, pageSize);
      const items = body?.data ?? [];
      if (!items || !items.length) break;

      for (const p of items) {
        const normalized: NormalizedProduct = {
          sku: p?.sku ?? (p?.variants && p?.variants[0] ? p.variants[0]?.sku : undefined),
          title: p?.name,
          description: p?.description,
          price: p?.price != null ? String(p.price) : undefined,
          images: (p?.images || []).map((i: any) => i?.url || i?.image_url).filter(Boolean),
          variants: p?.variants ?? [],
          raw: p,
        };
        yield normalized;
      }

      page += 1;
      if (page > 10000) break;
    }
  }

  return { paginateProducts };
}

export default {
  extractSkuFromIngestion,
  findProductBySku,
  importToBigCommerce,
  createBigCommerceAdapter,
};
