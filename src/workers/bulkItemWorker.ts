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

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const serviceApiKey = process.env.SERVICE_API_KEY || process.env.NEXT_PUBLIC_SERVICE_API_KEY || ""; // If you have a service API to call internal routes
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function markItem(id: string, updates: Record<string, any>) {
  return supabase.from("bulk_job_items").update(updates).eq("id", id);
}

async function startIngestAndPipelineForUrl(url: string) {
  // 1) POST /api/v1/ingest
  const ingestRes = await fetch(`${process.env.INTERNAL_API_BASE || ""}/api/v1/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}),
    },
    body: JSON.stringify({ url, persist: true, options: { includeSeo: true } }),
  });
  const ingestJson = await ingestRes.json().catch(() => null);
  if (!ingestRes.ok) throw new Error(ingestJson?.error || `ingest failed ${ingestRes.status}`);
  // If server responds with jobId, we need to poll /api/v1/ingest/job/:jobId until 200 returns ingestionId
  const jobId = ingestJson?.jobId ?? ingestJson?.ingestionId ?? null;
  if (!jobId) {
    // If immediate ingestionId returned
    const ingestionId = ingestJson?.ingestionId ?? ingestJson?.id ?? null;
    if (!ingestionId) throw new Error("ingest did not return jobId or ingestionId");
    return ingestionId;
  }

  // Poll job
  const start = Date.now();
  const timeoutMs = 120_000;
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${process.env.INTERNAL_API_BASE || ""}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: { ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}) },
    });
    if (r.status === 200) {
      const j = await r.json().catch(() => null);
      return j?.ingestionId ?? j?.id ?? null;
    }
    if (r.status === 409) {
      const payload = await r.json().catch(() => null);
      throw new Error(payload?.error || "ingest job failed (409)");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("ingest job timeout");
}

async function startPipeline(ingestionId: string, steps: string[] = ["extract", "seo"]) {
  const res = await fetch(`${process.env.INTERNAL_API_BASE || ""}/api/v1/pipeline/run`, {
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
    const r = await fetch(`${process.env.INTERNAL_API_BASE || ""}/api/v1/pipeline/run/${encodeURIComponent(runId)}`, {
      headers: { ...(serviceApiKey ? { "x-service-api-key": serviceApiKey } : {}) },
    });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.run) {
      const s = j.run.status;
      if (s === "succeeded" || s === "failed") return j;
    }
    await new Promise((r) => setTimeout(r, 2500));
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
    // 1) create ingestion for URL (or reuse if itemRow.ingestion_id present)
    let ingestionId = itemRow.ingestion_id ?? null;
    if (!ingestionId) {
      ingestionId = await startIngestAndPipelineForUrl(itemRow.input_url);
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    // 2) start pipeline (use quick by default or derive from bulk job options)
    const runId = await startPipeline(ingestionId, ["extract", "seo"]);
    await markItem(bulkJobItemId, { pipeline_run_id: runId });

    // 3) poll pipeline to completion (optional; for scale you might skip polling)
    const snap = await pollPipeline(runId);
    const finalStatus = snap.run?.status;
    if (finalStatus === "succeeded") {
      await markItem(bulkJobItemId, { status: "succeeded", finished_at: new Date().toISOString() });
      // update bulk_jobs counters
      await supabase.from("bulk_jobs").update({ completed_items: supabase.raw("completed_items + 1") }).eq("id", itemRow.bulk_job_id);
    } else {
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { pipelineStatus: finalStatus, run: snap.run },
      });
      await supabase.from("bulk_jobs").update({ failed_items: supabase.raw("failed_items + 1") }).eq("id", itemRow.bulk_job_id);
    }
  } catch (err: any) {
    console.error("item processing error", err);
    await markItem(bulkJobItemId, { status: "failed", finished_at: new Date().toISOString(), last_error: { message: String(err?.message || err) } });
    await supabase.from("bulk_jobs").update({ failed_items: supabase.raw("failed_items + 1") }).eq("id", itemRow.bulk_job_id);
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
