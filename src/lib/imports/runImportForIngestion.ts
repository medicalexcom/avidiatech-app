/**
 * src/lib/imports/runImportForIngestion.ts
 *
 * Full-featured import runner:
 * - Robust SKU extraction from many ingestion shapes
 * - Handles BigCommerce create/update, images, variants
 * - Persists import_jobs + import_rows and product_id back to product_ingestions
 * - Accepts optional tenantId fallback in opts when ingestion row lacks tenant
 * - Accepts pipelineRunId and moduleIndex to mark module_runs/pipeline_runs
 * - Non-fatal writes for pipeline bookkeeping so import success is preserved
 *
 * Drop this file over the existing file and deploy. Requires:
 *  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *  - decryptSecrets helper at "@/lib/integrations/encryption"
 */

import { createClient } from "@supabase/supabase-js";
import { decryptSecrets } from "@/lib/integrations/encryption";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- Helpers ----------
function bcBaseUrl(storeHash: string) {
  return `https://api.bigcommerce.com/stores/${encodeURIComponent(storeHash)}/v3`;
}
function bcHeaders(token: string) {
  return {
    "X-Auth-Token": token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}
async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, opts);
  const text = await res.text().catch(() => "");
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, text };
}

// Shallow product extraction to handle many ingestion shapes
function extractNormalizedProduct(ingestRow: any) {
  if (!ingestRow || typeof ingestRow !== "object") return null;

  const candidates = [
    ingestRow.normalized,
    ingestRow.normalized_product,
    ingestRow.normalized_payload,
    ingestRow.normalizedPayload,
    ingestRow.product,
    ingestRow.payload,
    ingestRow.data,
    ingestRow.seo_payload,
    ingestRow.seo,
    ingestRow.raw_payload,
    ingestRow,
  ];

  const getFirst = (obj: any, ...keys: string[]) => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (k in obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  const scanObject = (o: any) => {
    if (!o || typeof o !== "object") return null;
    const sku = getFirst(o, "sku", "SKU", "product_sku", "gtin", "gtin8", "mpn");
    const title = getFirst(o, "title", "name", "name_best", "product_name", "pageTitle", "h1");
    const description = getFirst(o, "description", "descriptionHtml", "description_raw", "shortDescription", "overview");
    const price = getFirst(o, "price", "list_price", "msrp", "price_cents");
    const variants = Array.isArray(o.variants) ? o.variants : Array.isArray(o.variant) ? o.variant : [];
    let images: string[] = [];
    if (Array.isArray(o.images)) {
      images = o.images.map((i: any) => (typeof i === "string" ? i : i.url ?? i.image_url ?? i.src ?? "")).filter(Boolean);
    } else if (Array.isArray(o.media)) {
      images = o.media.map((m: any) => (typeof m === "string" ? m : m.url ?? m.src ?? m.image_url ?? "")).filter(Boolean);
    } else if (o.image && typeof o.image === "string") {
      images = [o.image];
    }
    if (sku || title) {
      return { sku, title, description, price, variants, images, raw: o };
    }
    return null;
  };

  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string") {
      try {
        const parsed = JSON.parse(c);
        const psc = scanObject(parsed);
        if (psc) return psc;
      } catch {
        // ignore non-JSON strings
      }
    } else {
      const scanned = scanObject(c);
      if (scanned) return scanned;
    }
  }

  // fallback: shallow walk top-level keys
  for (const k of Object.keys(ingestRow)) {
    const v = ingestRow[k];
    if (v && typeof v === "object") {
      const s = scanObject(v);
      if (s) return s;
    }
  }
  return null;
}

// Upload an image into BigCommerce by image URL (POST /catalog/products/{id}/images)
async function uploadProductImage(storeBase: string, token: string, productId: number, imageUrl: string, isThumbnail = false) {
  try {
    const url = `${storeBase}/catalog/products/${productId}/images`;
    const body = JSON.stringify({ image_url: imageUrl, is_thumbnail: isThumbnail });
    const { res } = await fetchJson(url, { method: "POST", headers: bcHeaders(token), body });
    return res.ok;
  } catch {
    return false;
  }
}

// Find variant by SKU and product_id - returns variant object or null
async function findVariantBySku(storeBase: string, token: string, sku: string) {
  try {
    const url = `${storeBase}/catalog/variants?sku=${encodeURIComponent(sku)}`;
    const { res, body } = await fetchJson(url, { headers: bcHeaders(token) });
    if (!res.ok) return null;
    const items = body?.data ?? body;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[0];
  } catch {
    return null;
  }
}

// ---------- Main function ----------
export async function runImportForIngestion(opts: {
  ingestionId: string;
  platform?: "bigcommerce";
  allowOverwriteExisting?: boolean;
  pipelineRunId?: string;
  moduleIndex?: number;
  tenantId?: string; // optional fallback
}): Promise<any> {
  const ingestionId = String(opts.ingestionId || "");
  if (!ingestionId) throw new Error("missing_ingestionId");

  // Defensive table lookup
  const ingestionTables = ["product_ingestions", "ingestions", "product_ingestion", "ingestion"];
  let ingestionRow: any = null;
  for (const t of ingestionTables) {
    try {
      const q = await supaAdmin.from(t).select("*").eq("id", ingestionId).maybeSingle();
      if (!q.error && q.data) {
        ingestionRow = q.data;
        break;
      }
    } catch {
      // ignore
    }
  }
  if (!ingestionRow) throw new Error("ingestion_not_found");

  // tenant id from row or fallback to opts.tenantId
  const tenantId =
    ingestionRow.org_id ??
    ingestionRow.tenant_id ??
    ingestionRow.tenantId ??
    ingestionRow.orgId ??
    (opts.tenantId ?? null);

  if (!tenantId) throw new Error("missing_tenant_id_for_import");

  // load connection
  const { data: connections, error: connErr } = await supaAdmin
    .from("ecommerce_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("platform", "bigcommerce")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (connErr) throw new Error(`connection_load_failed:${String(connErr.message ?? connErr)}`);
  if (!connections || (Array.isArray(connections) && connections.length === 0)) throw new Error("connection_not_found");

  const conn = Array.isArray(connections) ? connections[0] : connections;
  const secretsBlob = conn.secrets_enc ?? conn.secrets ?? conn.encrypted_secrets ?? null;
  if (!secretsBlob) throw new Error("connection_load_failed:missing_secrets");

  let secrets: any = {};
  try {
    secrets = decryptSecrets(secretsBlob);
  } catch (e: any) {
    throw new Error(`connection_load_failed:decrypt_failed:${String(e?.message ?? e)}`);
  }

  const cfg = conn.config ?? {};
  const storeHash = cfg.store_hash ?? cfg.storeHash ?? undefined;
  const token = secrets.access_token ?? secrets.accessToken ?? secrets.token ?? undefined;
  if (!storeHash || !token) throw new Error("bigcommerce_connection_incomplete");

  // create import job
  const createdBy = "00000000-0000-5000-8000-000000000000";
  const { data: jobRow, error: jobErr } = await supaAdmin
    .from("import_jobs")
    .insert([
      {
        org_id: tenantId,
        created_by: createdBy,
        file_path: null,
        file_name: `ingestion-${ingestionId}`,
        status: "processing",
        total_rows: 1,
        processed_rows: 0,
        result_summary: {},
        meta: { ingestionId, connector_id: conn.id },
      },
    ])
    .select("*")
    .single();

  if (jobErr || !jobRow) throw new Error("import_persist_failed:create_job");
  const jobId = jobRow.id as string;

  // insert import_rows stub
  const rowStub = { job_id: jobId, row_number: 1, data: ingestionRow, status: "pending", errors: [] };
  const { error: insertRowErr } = await supaAdmin.from("import_rows").insert([rowStub]);
  if (insertRowErr) {
    await supaAdmin.from("import_jobs").update({ status: "failed", errors: JSON.stringify([insertRowErr.message ?? String(insertRowErr)]) }).eq("id", jobId);
    throw new Error("import_persist_failed:insert_row");
  }

  // normalize product
  const norm = extractNormalizedProduct(ingestionRow);
  if (!norm || !norm.sku) {
    const msg = "missing_sku_in_ingestion";
    await supaAdmin.from("import_rows").update({ status: "failed", errors: JSON.stringify([msg]) }).eq("job_id", jobId).eq("row_number", 1);
    await supaAdmin.from("import_jobs").update({ status: "failed", processed_rows: 0, result_summary: { successes: 0, failures: 1 }, errors: JSON.stringify([msg]) }).eq("id", jobId);
    throw new Error("missing_sku");
  }

  const sku = String(norm.sku);
  const productPayload = {
    name: norm.title ?? `Product ${sku}`,
    description: norm.description ?? "",
    price: norm.price ?? undefined,
    images: (norm.images || []).map((u: string, i: number) => ({ image_url: u, is_thumbnail: i === 0 })),
    variants: (norm.variants || []).map((v: any) => {
      const option_values = Array.isArray(v.options)
        ? v.options.map((o: any) => ({ option_display_name: o.name ?? "Option", label: o.value ?? o }))
        : v.option_values ?? v.optionValues ?? undefined;
      return { sku: v.sku ?? sku, price: v.price ?? v.list_price ?? undefined, option_values };
    }),
    meta: { source: "pipeline_import", ingestionId, raw: norm.raw },
  };

  const storeBase = bcBaseUrl(storeHash);

  try {
    // find existing by SKU
    const findUrl = `${storeBase}/catalog/products?sku=${encodeURIComponent(sku)}`;
    const { res: findRes, body: findBody } = await fetchJson(findUrl, { headers: bcHeaders(token) });
    if (!findRes.ok) {
      const errText = typeof findBody === "string" ? findBody : JSON.stringify(findBody);
      throw new Error(`bigcommerce_find_failed:${findRes.status}:${errText}`);
    }

    const existingItems = (findBody && (findBody.data ?? findBody)) || [];

    if (Array.isArray(existingItems) && existingItems.length > 0) {
      // update existing product
      const existing = existingItems[0];
      const productId = existing.id;
      const updateUrl = `${storeBase}/catalog/products/${productId}`;
      const updateBody: any = { name: productPayload.name, description: productPayload.description };
      if (productPayload.price) updateBody.price = productPayload.price;

      const { res: upRes, body: upBody } = await fetchJson(updateUrl, { method: "PUT", headers: bcHeaders(token), body: JSON.stringify(updateBody) });
      if (!upRes.ok) {
        await supaAdmin.from("import_rows").update({ status: "failed", errors: JSON.stringify([{ reason: `bigcommerce_update_failed:${upRes.status}`, detail: upBody }]) }).eq("job_id", jobId).eq("row_number", 1);
        await supaAdmin.from("import_jobs").update({ status: "failed", processed_rows: 0, result_summary: { successes: 0, failures: 1 } }).eq("id", jobId);
        return { ok: false, reason: `bigcommerce_update_failed:${upRes.status}`, detail: upBody };
      }

      // images
      if (Array.isArray(productPayload.images) && productPayload.images.length) {
        for (const im of productPayload.images) {
          try {
            await uploadProductImage(storeBase, token, productId, im.image_url, Boolean(im.is_thumbnail));
          } catch {
            // continue on image errors
          }
        }
      }

      // variants upsert (best-effort)
      if (Array.isArray(productPayload.variants) && productPayload.variants.length) {
        for (const v of productPayload.variants) {
          try {
            const vSku = v.sku ?? null;
            if (!vSku) continue;
            const foundVariant = await findVariantBySku(storeBase, token, vSku);
            if (foundVariant && foundVariant.product_id === productId) {
              // update variant
              const vUpdateUrl = `${storeBase}/catalog/variants/${foundVariant.id}`;
              await fetchJson(vUpdateUrl, { method: "PUT", headers: bcHeaders(token), body: JSON.stringify({ price: v.price ?? undefined }) });
            } else {
              // create variant under product
              const vCreateUrl = `${storeBase}/catalog/products/${productId}/variants`;
              await fetchJson(vCreateUrl, { method: "POST", headers: bcHeaders(token), body: JSON.stringify({ sku: vSku, price: v.price ?? undefined, option_values: v.option_values ?? undefined }) });
            }
          } catch {
            // ignore per-variant errors
          }
        }
      }

      // persist product_id (non-fatal)
      try {
        await supaAdmin.from("product_ingestions").update({ product_id: String(productId) }).eq("id", ingestionId);
      } catch {
        // ignore
      }

      // finalize job/row
      await supaAdmin.from("import_rows").update({ status: "success", data: ingestionRow, errors: JSON.stringify([]) }).eq("job_id", jobId).eq("row_number", 1);
      await supaAdmin.from("import_jobs").update({ status: "complete", processed_rows: 1, result_summary: { successes: 1, failures: 0 } }).eq("id", jobId);

      // update module_runs/pipeline_runs if context provided (non-fatal)
      if (opts.pipelineRunId && typeof opts.moduleIndex === "number") {
        try {
          await supaAdmin.from("module_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("pipeline_run_id", opts.pipelineRunId).eq("module_index", opts.moduleIndex);
          await supaAdmin.from("pipeline_module_logs").insert([{ pipeline_run_id: opts.pipelineRunId, module_index: opts.moduleIndex, level: "info", message: "Import completed successfully", meta: { ingestionId } }]);
          const { data: pending } = await supaAdmin.from("module_runs").select("id").eq("pipeline_run_id", opts.pipelineRunId).in("status", ["queued", "running", "failed"]).limit(1);
          if (!pending || (Array.isArray(pending) && pending.length === 0)) {
            await supaAdmin.from("pipeline_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", opts.pipelineRunId);
          }
        } catch {
          // non-fatal
        }
      }

      return { ok: true, action: "updated", product_id: productId, sku };
    } else {
      // create product
      const createUrl = `${storeBase}/catalog/products`;
      const createPayload: any = { name: productPayload.name, description: productPayload.description, type: "physical" };
      if (productPayload.price) createPayload.price = productPayload.price;
      if (Array.isArray(productPayload.images) && productPayload.images.length) {
        createPayload.images = productPayload.images.map((im: any) => ({ image_url: im.image_url, is_thumbnail: !!im.is_thumbnail }));
      }
      if (Array.isArray(productPayload.variants) && productPayload.variants.length) {
        createPayload.variants = productPayload.variants.map((v: any) => ({ sku: v.sku ?? sku, price: v.price ?? undefined, option_values: v.option_values ?? undefined }));
      } else {
        createPayload.sku = sku;
        if (productPayload.price) createPayload.price = productPayload.price;
      }

      const { res: cRes, body: cBody } = await fetchJson(createUrl, { method: "POST", headers: bcHeaders(token), body: JSON.stringify(createPayload) });
      if (!cRes.ok) {
        await supaAdmin.from("import_rows").update({ status: "failed", errors: JSON.stringify([{ reason: `bigcommerce_create_failed:${cRes.status}`, detail: cBody }]) }).eq("job_id", jobId).eq("row_number", 1);
        await supaAdmin.from("import_jobs").update({ status: "failed", processed_rows: 0, result_summary: { successes: 0, failures: 1 } }).eq("id", jobId);
        return { ok: false, reason: `bigcommerce_create_failed:${cRes.status}`, detail: cBody };
      }

      const createdProduct = (cBody && (cBody.data ?? cBody)) ?? null;
      const createdId = createdProduct?.id ?? createdProduct?.product_id ?? null;

      if (createdId) {
        try {
          await supaAdmin.from("product_ingestions").update({ product_id: String(createdId) }).eq("id", ingestionId);
        } catch {
          // ignore
        }
      }

      // finalize job/row
      await supaAdmin.from("import_rows").update({ status: "success", data: { ...ingestionRow, product: createdProduct }, errors: JSON.stringify([]) }).eq("job_id", jobId).eq("row_number", 1);
      await supaAdmin.from("import_jobs").update({ status: "complete", processed_rows: 1, result_summary: { successes: 1, failures: 0 } }).eq("id", jobId);

      // pipeline updates (non-fatal)
      if (opts.pipelineRunId && typeof opts.moduleIndex === "number") {
        try {
          await supaAdmin.from("module_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("pipeline_run_id", opts.pipelineRunId).eq("module_index", opts.moduleIndex);
          await supaAdmin.from("pipeline_module_logs").insert([{ pipeline_run_id: opts.pipelineRunId, module_index: opts.moduleIndex, level: "info", message: "Import completed successfully (created)", meta: { ingestionId, createdProduct } }]);
          const { data: pending } = await supaAdmin.from("module_runs").select("id").eq("pipeline_run_id", opts.pipelineRunId).in("status", ["queued", "running", "failed"]).limit(1);
          if (!pending || (Array.isArray(pending) && pending.length === 0)) {
            await supaAdmin.from("pipeline_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", opts.pipelineRunId);
          }
        } catch {
          // non-fatal
        }
      }

      return { ok: true, action: "created", product_id: createdId ?? null, sku };
    }
  } catch (e: any) {
    const errMsg = String(e?.message ?? e);
    // Mark failure in DB
    await supaAdmin.from("import_rows").update({ status: "failed", errors: JSON.stringify([errMsg]) }).eq("job_id", jobId).eq("row_number", 1);
    await supaAdmin.from("import_jobs").update({ status: "failed", processed_rows: 0, result_summary: { successes: 0, failures: 1 }, errors: JSON.stringify([errMsg]) }).eq("id", jobId);
    throw e;
  }
}

export default runImportForIngestion;
