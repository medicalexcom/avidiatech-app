import { createClient } from "@supabase/supabase-js";
import type { Redis } from "ioredis";
import { createShopifyAdapter } from "../ecommerce/connectors/shopify";
import { createBigCommerceAdapter } from "../ecommerce/connectors/bigcommerce";
import { createRestAdapter } from "../ecommerce/connectors/restAdapter";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "400", 10);

async function insertRowsBatch(rows: any[]) {
  if (!rows.length) return;
  try {
    await supa.from("import_rows").insert(rows);
  } catch (err) {
    console.warn("insertRowsBatch failed:", err);
  }
}

export async function connectorSyncProcessor(data: { integrationId: string; jobId: string }) {
  const { integrationId, jobId } = data;
  // mark processing
  await supa.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

  // fetch integration credentials
  const { data: integration } = await supa.from("integrations").select("*").eq("id", integrationId).single();
  if (!integration) {
    await supa.from("import_jobs").update({ status: "failed", updated_at: new Date().toISOString(), last_error: "integration not found" }).eq("id", jobId);
    return;
  }

  // decrypt secrets if needed (use existing helper if present)
  let secrets: any = null;
  try {
    secrets = integration.encrypted_secrets ? JSON.parse(integration.encrypted_secrets) : null;
  } catch (e) {
    secrets = null;
  }

  // choose adapter
  let adapter: any;
  if (integration.provider === "shopify") {
    adapter = createShopifyAdapter({ shopDomain: integration.config.shopDomain, accessToken: secrets?.accessToken ?? "" });
  } else if (integration.provider === "bigcommerce") {
    adapter = createBigCommerceAdapter({ storeHash: integration.config.storeHash, accessToken: secrets?.accessToken ?? "" });
  } else {
    adapter = createRestAdapter({ baseUrl: integration.config.baseUrl, authHeader: secrets?.authHeader ?? null });
  }

  const rowsBuffer: any[] = [];
  let inserted = 0;
  try {
    for await (const product of adapter.paginateProducts()) {
      rowsBuffer.push({
        job_id: jobId,
        row_number: null,
        status: "queued",
        data: product,
        created_at: new Date().toISOString(),
      });
      if (rowsBuffer.length >= BATCH_SIZE) {
        await insertRowsBatch(rowsBuffer.splice(0, rowsBuffer.length));
        inserted += BATCH_SIZE;
        await supa.from("import_jobs").update({ meta: { processed: inserted } }).eq("id", jobId);
      }
    }
    // flush remainder
    if (rowsBuffer.length) {
      await insertRowsBatch(rowsBuffer.splice(0, rowsBuffer.length));
    }

    // mark complete
    await supa.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
  } catch (err: any) {
    console.error("connectorSyncProcessor error:", err);
    await supa.from("import_jobs").update({ status: "failed", updated_at: new Date().toISOString(), last_error: String(err?.message ?? err) }).eq("id", jobId);
  }
}

import { parse } from "papaparse";
import fs from "fs";
import path from "path";

export async function importProcessProcessor(data: { jobId: string }) {
  const { jobId } = data;
  // fetch import_job
  const { data: jobRow } = await supa.from("import_jobs").select("*").eq("id", jobId).single();
  if (!jobRow) return;
  const filePath = jobRow.file_path;
  if (!filePath) {
    await supa.from("import_jobs").update({ status: "failed", last_error: "no file_path" }).eq("id", jobId);
    return;
  }

  await supa.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

  try {
    // Download file from Supabase storage to a local temp path (streaming approach recommended)
    const storage = supa.storage.from(jobRow.meta?.bucket ?? "imports");

    // Correct handling of Supabase download result: { data, error }
    const downloadResult = await storage.download(filePath);
    // downloadResult may be { data: Blob|null, error: StorageError|null }
    // Use destructuring for clarity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: downloadedData, error: downloadError }: any = downloadResult as any;
    if (downloadError || !downloadedData) {
      const msg = downloadError?.message ?? "failed to download file";
      throw new Error(`download_failed:${msg}`);
    }

    // downloadedData is typically a Blob in Node runtime; ensure we can get an ArrayBuffer from it
    let buffer: Buffer;
    if (typeof downloadedData.arrayBuffer === "function") {
      // Blob-like
      const arrayBuffer = await downloadedData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(downloadedData)) {
      // Already a Buffer (safety)
      buffer = downloadedData;
    } else if (downloadedData instanceof Uint8Array) {
      buffer = Buffer.from(downloadedData);
    } else if (typeof downloadedData.text === "function") {
      // Fallback: text() available (unlikely for binary, but safe)
      const txt = await downloadedData.text();
      buffer = Buffer.from(txt);
    } else {
      // Last resort: stringify
      const asString = String(downloadedData);
      buffer = Buffer.from(asString);
    }

    const tmpPath = path.join("/tmp", `import-${jobId}.csv`);
    fs.writeFileSync(tmpPath, buffer);

    // parse via papaparse in streaming mode
    const stream = fs.createReadStream(tmpPath);
    await new Promise<void>((resolve, reject) => {
      let rowCount = 0;
      const rowsBuffer: any[] = [];
      parse(stream as any, {
        header: true,
        step: async (results) => {
          rowCount += 1;
          rowsBuffer.push({
            job_id: jobId,
            row_number: rowCount,
            status: "queued",
            data: results.data,
            created_at: new Date().toISOString(),
          });
          if (rowsBuffer.length >= BATCH_SIZE) {
            const toInsert = rowsBuffer.splice(0, rowsBuffer.length);
            await insertRowsBatch(toInsert);
          }
        },
        complete: async () => {
          if (rowsBuffer.length) await insertRowsBatch(rowsBuffer.splice(0, rowsBuffer.length));
          // mark complete
          await supa.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
          resolve();
        },
        error: async (err) => {
          await supa.from("import_jobs").update({ status: "failed", last_error: String(err?.message ?? err) }).eq("id", jobId);
          reject(err);
        },
      });
    });
  } catch (err: any) {
    console.error("importProcessProcessor failed:", err);
    await supa.from("import_jobs").update({ status: "failed", last_error: String(err?.message ?? err) }).eq("id", jobId);
  }
}

export async function pipelineRetryProcessor(data: { pipelineRunId: string }) {
  // Skeleton: create new pipeline_run and enqueue modules (implementation depends on pipeline design)
  console.log("pipelineRetryProcessor called for", data.pipelineRunId);
  // TODO: read pipeline_runs, create new run, enqueue module tasks
}
