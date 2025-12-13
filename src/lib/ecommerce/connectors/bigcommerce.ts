import { safeFetch } from "@/lib/utils/safeFetch";

export type BigCommerceCredentials = {
  store_hash: string;
  access_token: string;
};

export type BigCommerceUpsertOptions = {
  allowOverwriteExisting?: boolean; // default false (safe)
};

export type BigCommerceImportResult = {
  ok: boolean;
  platform: "bigcommerce";
  action: "created" | "needs_review" | "updated";
  product_id?: number;
  sku?: string | null;
  warnings: string[];
  needs_review?: boolean;
  reason?: string;
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

// Conservative SKU extraction: extend later as normalized model gets richer
export function extractSkuFromIngestion(row: any): string | null {
  const normalized = row?.normalized_payload ?? {};
  const candidates = [
    normalized?.sku,
    normalized?.mpn,
    normalized?.part_number,
    normalized?.specs?.sku,
    normalized?.specs?.mpn,
  ];

  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return null;
}

export async function findProductBySku(args: { creds: BigCommerceCredentials; sku: string }) {
  // BC keyword is broad; we filter for exact sku match once we get results
  const url = `${bcBaseUrl(args.creds.store_hash)}/catalog/products?keyword=${encodeURIComponent(args.sku)}&limit=50`;

  const res = await safeFetch(url, {
    method: "GET",
    headers: headers(args.creds.access_token),
    timeoutMs: 12_000,
  });

  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`bigcommerce_search_failed:${res.status}:${text}`);
  }

  const data = json?.data ?? [];
  const exact = data.find((p: any) => String(p?.sku ?? "").trim() === args.sku);
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

export async function importToBigCommerce(args: {
  creds: BigCommerceCredentials;
  ingestionRow: any;
  opts?: BigCommerceUpsertOptions;
}): Promise<BigCommerceImportResult> {
  const sku = extractSkuFromIngestion(args.ingestionRow);
  const warnings: string[] = [];
  const allowOverwriteExisting = Boolean(args.opts?.allowOverwriteExisting);

  if (!sku) warnings.push("missing_sku");

  let existing: any = null;
  if (sku) existing = await findProductBySku({ creds: args.creds, sku });

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
    const updateUrl = `${bcBaseUrl(args.creds.store_hash)}/catalog/products/${existing.id}`;
    const updatePayload = buildProductPayloadFromIngestion(args.ingestionRow, sku);

    const res = await safeFetch(updateUrl, {
      method: "PUT",
      headers: headers(args.creds.access_token),
      body: JSON.stringify(updatePayload),
      timeoutMs: 15_000,
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`bigcommerce_update_failed:${res.status}:${text}`);

    const json = text ? JSON.parse(text) : null;
    const updated = json?.data ?? null;

    return {
      ok: true,
      platform: "bigcommerce",
      action: "updated",
      product_id: updated?.id ?? existing.id,
      sku,
      warnings,
    };
  }

  const createUrl = `${bcBaseUrl(args.creds.store_hash)}/catalog/products`;
  const createPayload = buildProductPayloadFromIngestion(args.ingestionRow, sku);

  const res = await safeFetch(createUrl, {
    method: "POST",
    headers: headers(args.creds.access_token),
    body: JSON.stringify(createPayload),
    timeoutMs: 15_000,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`bigcommerce_create_failed:${res.status}:${text}`);

  const json = text ? JSON.parse(text) : null;
  const created = json?.data ?? null;

  return {
    ok: true,
    platform: "bigcommerce",
    action: "created",
    product_id: created?.id ?? undefined,
    sku,
    warnings,
  };
}
