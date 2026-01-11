import { createClient } from "@supabase/supabase-js";
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

async function logModule(pipelineRunId: string | null, moduleIndex: number, level: string, message: string, meta?: any) {
  if (!pipelineRunId) return;
  try {
    await supa.from("pipeline_module_logs").insert({
      pipeline_run_id: pipelineRunId,
      module_index: moduleIndex,
      level,
      message,
      meta: meta ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("failed to write pipeline_module_logs:", e);
  }
}

/**
 * connectorSyncProcessor: logs lifecycle events and errors to pipeline_module_logs.
 * moduleIndex is 0 for connector sync in import job conventions (update if your schema differs).
 */
export async function connectorSyncProcessor(data: { integrationId: string; jobId: string }) {
  const { integrationId, jobId } = data;
  const pipelineRunId = jobId; // reuse job id as pipeline run id if appropriate; adjust if different in your schema
  const moduleIndex = 0;

  await supa.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);
  await logModule(pipelineRunId, moduleIndex, "info", "connectorSync started", { integrationId });

  const { data: integration } = await supa.from("integrations").select("*").eq("id", integrationId).single();
  if (!integration) {
    await logModule(pipelineRunId, moduleIndex, "error", "integration not found");
    await supa.from("import_jobs").update({ status: "failed", updated_at: new Date().toISOString(), last_error: "integration not found" }).eq("id", jobId);
    return;
  }

  let secrets: any = null;
  try {
    secrets = integration.encrypted_secrets ? JSON.parse(integration.encrypted_secrets) : null;
  } catch (e) {
    secrets = null;
  }

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
        await logModule(pipelineRunId, moduleIndex, "info", `inserted ${inserted} rows`, { processed: inserted });
      }
    }
    if (rowsBuffer.length) {
      await insertRowsBatch(rowsBuffer.splice(0, rowsBuffer.length));
      inserted += rowsBuffer.length;
      await logModule(pipelineRunId, moduleIndex, "info", `inserted final ${rowsBuffer.length} rows`, { processed: inserted });
    }
    await supa.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
    await logModule(pipelineRunId, moduleIndex, "info", "connectorSync completed", { totalInserted: inserted });
  } catch (err: any) {
    console.error("connectorSyncProcessor error:", err);
    await logModule(pipelineRunId, moduleIndex, "error", String(err?.message ?? err), { error: String(err?.message ?? err) });
    await supa.from("import_jobs").update({ status: "failed", updated_at: new Date().toISOString(), last_error: String(err?.message ?? err) }).eq("id", jobId);
  }
}

import { parse } from "papaparse";
import fs from "fs";
import path from "path";

export async function importProcessProcessor(data: { jobId: string }) {
  const { jobId } = data;
  const pipelineRunId = jobId;
  const moduleIndex = 0;

  const { data: jobRow } = await supa.from("import_jobs").select("*").eq("id", jobId).single();
  if (!jobRow) return;
  const filePath = jobRow.file_path;
  if (!filePath) {
    await logModule(pipelineRunId, moduleIndex, "error", "missing file_path in import_job");
    await supa.from("import_jobs").update({ status: "failed", last_error: "no file_path" }).eq("id", jobId);
    return;
  }

  await supa.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);
  await logModule(pipelineRunId, moduleIndex, "info", "importProcess started", { filePath });

  try {
    const storage = supa.storage.from(jobRow.meta?.bucket ?? "imports");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downloadResult: any = await storage.download(filePath);
    const { data: downloadedData, error: downloadError } = downloadResult ?? {};
    if (downloadError || !downloadedData) {
      const msg = downloadError?.message ?? "failed to download file";
      await logModule(pipelineRunId, moduleIndex, "error", `download_failed: ${msg}`);
      throw new Error(`download_failed:${msg}`);
    }

    let buffer: Buffer;
    if (typeof downloadedData.arrayBuffer === "function") {
      const arrayBuffer = await downloadedData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(downloadedData)) {
      buffer = downloadedData;
    } else if (downloadedData instanceof Uint8Array) {
      buffer = Buffer.from(downloadedData);
    } else if (typeof downloadedData.text === "function") {
      const txt = await downloadedData.text();
      buffer = Buffer.from(txt);
    } else {
      buffer = Buffer.from(String(downloadedData));
    }

    const tmpPath = path.join("/tmp", `import-${jobId}.csv`);
    fs.writeFileSync(tmpPath, buffer);

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
            await logModule(pipelineRunId, moduleIndex, "info", `inserted ${rowCount} rows`, { rowsProcessed: rowCount });
          }
        },
        complete: async () => {
          if (rowsBuffer.length) await insertRowsBatch(rowsBuffer.splice(0, rowsBuffer.length));
          await supa.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
          await logModule(pipelineRunId, moduleIndex, "info", `importProcess completed, rows=${rowCount}`, { rows: rowCount });
          resolve();
        },
        error: async (err) => {
          await logModule(pipelineRunId, moduleIndex, "error", String(err?.message ?? err));
          await supa.from("import_jobs").update({ status: "failed", last_error: String(err?.message ?? err) }).eq("id", jobId);
          reject(err);
        },
      });
    });
  } catch (err: any) {
    console.error("importProcessProcessor failed:", err);
    await logModule(pipelineRunId, moduleIndex, "error", String(err?.message ?? err));
    await supa.from("import_jobs").update({ status: "failed", last_error: String(err?.message ?? err) }).eq("id", jobId);
  }
}

export async function pipelineRetryProcessor(data: { pipelineRunId: string }) {
  const { pipelineRunId } = data;
  // Placeholder: create a new pipeline_run or re-enqueue modules
  await logModule(pipelineRunId, 0, "info", "pipelineRetryProcessor invoked");
  // TODO: implement pipeline run recreation / re-enqueueing
}
