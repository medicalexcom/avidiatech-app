// src/workers/bulkItemWorker.ts
// Node worker: processes one bulk_job_item at a time.
// The worker will:
//  - mark item in_progress
//  - create ingestion via /api/v1/ingest (service key) or call supabase function if available
//  - poll job completion (ingest), start pipeline run, optionally poll pipeline status
//  - update item row with ingestion_id, pipeline_run_id, finished_at, status, last_error
//
// Note: For throughput at large scale consider configuring worker concurrency and optionally
// move pipeline polling to a separate watcher service. This worker by default waits for ingestion -> pipeline completion.

import { getRedisConnection } from "@/lib/queue/bull";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { incrementBulkCounters } from "@/lib/bulk/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serviceApiKey = process.env.SERVICE_API_KEY || process.env.NEXT_PUBLIC_SERVICE_API_KEY || "";
const internalApiBase = process.env.INTERNAL_API_BASE || ""; // e.g. https://app.example.com

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

async function markItem(id: string, updates: Record<string, any>) {
  return supabase.from("bulk_job_items").update(updates).eq("id", id);
}

async function startIngestAndReturnIngestionId(url: string) {
  // 1) POST /api/v1/ingest
  const ingestRes = await fetch(`${internalApiBase}/api/v1/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}),
    },
    body: JSON.stringify({ url, persist: true, options: { includeSeo: true } }),
  });
  const ingestJson = await ingestRes.json().catch(() => null);
  if (!ingestRes.ok) {
    const msg = ingestJson?.error ?? `ingest failed ${ingestRes.status}`;
    throw new Error(msg);
  }

  // If API returned an ingestionId directly
  const possibleIngestionId =
    ingestJson?.ingestionId ?? ingestJson?.id ?? ingestJson?.data?.id ?? ingestJson?.data?.ingestionId ?? null;
  if (possibleIngestionId) {
    // If status indicates accepted with jobId, we still need to poll
    if (ingestJson?.status === "accepted" || ingestRes.status === 202) {
      const jobId = ingestJson?.jobId ?? ingestJson?.ingestionId ?? possibleIngestionId;
      return await pollForIngestionJob(jobId);
    }
    return possibleIngestionId;
  }

  const jobId = ingestJson?.jobId ?? ingestJson?.job?.id ?? null;
  if (!jobId) throw new Error("ingest did not return an ingestionId or jobId");
  return await pollForIngestionJob(jobId);
}

async function pollForIngestionJob(jobId: string, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${internalApiBase}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: { ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}) },
    });
    const j = await r.json().catch(() => null);
    if (r.status === 200) {
      return j?.ingestionId ?? j?.id ?? null;
    }
    if (r.status === 409) {
      const msg = (j?.error && (j.error.message || j.error)) || j?.detail || "ingest_engine_error";
      const err: any = new Error(msg);
      err.payload = j;
      throw err;
    }
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error("ingest job timeout");
}

async function startPipeline(ingestionId: string, steps: string[] = ["extract", "seo"]) {
  const res = await fetch(`${internalApiBase}/api/v1/pipeline/run`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}) },
    body: JSON.stringify({
      ingestionId,
      triggerModule: "seo",
      steps,
      options: {},
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `pipeline start failed: ${res.status}`);
  return String(json.pipelineRunId);
}

async function pollPipeline(runId: string, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${internalApiBase}/api/v1/pipeline/run/${encodeURIComponent(runId)}`, {
      headers: { ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}) },
    });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.run) {
      const s = j.run.status;
      if (s === "succeeded" || s === "failed") return j;
    }
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error("pipeline poll timeout");
}

async function handle(job: any) {
  const { bulkJobItemId } = job.data;
  console.log("processing bulk item", bulkJobItemId);

  // fetch item row
  const { data: itemRow, error: itemErr } = await supabase.from("bulk_job_items").select("*").eq("id", bulkJobItemId).maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) throw new Error("item not found");

  // mark started
  await markItem(bulkJobItemId, { status: "in_progress", started_at: new Date().toISOString(), tries: (itemRow.tries || 0) + 1 });

  try {
    // create ingestion if needed
    let ingestionId = itemRow.ingestion_id ?? null;
    if (!ingestionId) {
      ingestionId = await startIngestAndReturnIngestionId(itemRow.input_url);
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    // start pipeline
    const runId = await startPipeline(ingestionId, ["extract", "seo"]);
    await markItem(bulkJobItemId, { pipeline_run_id: runId });

    // poll pipeline to completion (for now we wait)
    const snap = await pollPipeline(runId);
    const finalStatus = snap.run?.status;

    if (finalStatus === "succeeded") {
      await markItem(bulkJobItemId, { status: "succeeded", finished_at: new Date().toISOString() });
      // atomically increment counters via helper (avoids using supabase.raw)
      await incrementBulkCounters(itemRow.bulk_job_id, { completed: 1 });
    } else {
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { pipelineStatus: finalStatus, run: snap.run },
      });
      await incrementBulkCounters(itemRow.bulk_job_id, { failed: 1 });
    }
  } catch (err: any) {
    console.error("item processing error", err);
    await markItem(bulkJobItemId, { status: "failed", finished_at: new Date().toISOString(), last_error: { message: String(err?.message || err) } });
    try {
      await incrementBulkCounters(itemRow.bulk_job_id, { failed: 1 });
    } catch (e) {
      console.warn("incrementBulkCounters failed", e);
    }
  }
}

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");
  const connection = getRedisConnection();
  const worker = new Worker("bulk-item", async (job: any) => handle(job), { connection, concurrency: parseInt(process.env.BULK_ITEM_CONCURRENCY || "8", 10) });

  worker.on("completed", (job: any) => console.log("item completed", job.id));
  worker.on("failed", (job: any, err: any) => console.error("item failed", job.id, err));

  console.log("bulk-item worker started");
})();
