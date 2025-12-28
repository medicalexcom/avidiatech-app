// scripts/bulkWorker.ts
// Run this as a separate process (node dist/scripts/bulkWorker.js) or container image.
// Requires REDIS_URL and INTERNAL_API_BASE env vars, and Supabase config via getServiceSupabaseClient.

import { Worker, Job } from "bullmq";
import { getRedisConnection, bulkQueueName } from "@/lib/queue";
import { getServiceSupabaseClient } from "@/lib/supabase";
import fetch from "node-fetch";
import { URL } from "url";

const supabase = getServiceSupabaseClient();
const REDIS = getRedisConnection();
const API_BASE = process.env.INTERNAL_API_BASE ?? "http://localhost:3000";

const MAX_CONCURRENCY = Number(process.env.BULK_WORKER_CONCURRENCY ?? 10);
const PER_DOMAIN_LIMIT = Number(process.env.BULK_WORKER_PER_DOMAIN ?? 3);

// Simple in-memory per-domain concurrency (per worker). For distributed per-domain limits implement Redis locks/semaphores.
const domainCounts = new Map<string, number>();

function domainFromUrl(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return "unknown";
  }
}

async function createIngestionForItem(url: string, metadata: any) {
  const res = await fetch(`${API_BASE}/api/v1/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, persist: true, options: { includeSeo: true, metadata } }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(json?.error?.message || `ingest_start_failed:${res.status}`);
    err.payload = json;
    throw err;
  }
  const ingestionId = json?.ingestionId ?? json?.id ?? json?.data?.id ?? null;
  const jobId = json?.jobId ?? json?.job?.id ?? null;

  if (ingestionId) return ingestionId;
  if (jobId) {
    // poll for ingestion job
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const jr = await fetch(`${API_BASE}/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
      if (jr.status === 200) {
        const jjson = await jr.json().catch(() => null);
        return jjson?.ingestionId ?? jjson?.id ?? null;
      }
      if (jr.status === 409) {
        const jjson = await jr.json().catch(() => null);
        const err: any = new Error(jjson?.error?.message || "ingest_job_failed");
        err.payload = jjson;
        throw err;
      }
    }
    throw new Error("ingest_job_poll_timeout");
  }
  throw new Error("unexpected_ingest_response");
}

async function startPipeline(ingestionId: string, mode: "quick" | "full") {
  const steps = mode === "quick" ? ["extract", "seo"] : ["extract", "seo", "audit", "import", "monitor", "price"];
  const res = await fetch(`${API_BASE}/api/v1/pipeline/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingestionId, triggerModule: "seo", steps, options: {} }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(json?.error?.message || `pipeline_start_failed:${res.status}`);
    err.payload = json;
    throw err;
  }
  const runId = String(json?.pipelineRunId ?? "");
  if (!runId) throw new Error("pipeline_start_no_runid");
  return runId;
}

async function pollPipeline(runId: string) {
  for (let i = 0; i < 300; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${API_BASE}/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error?.message || `pipeline_poll_failed:${res.status}`);
    }
    const snap = await res.json().catch(() => null);
    const status = snap?.run?.status;
    if (status === "succeeded" || status === "failed") return snap;
  }
  throw new Error("pipeline_poll_timeout");
}

async function updateItem(itemId: string, patch: any) {
  await supabase.from("bulk_job_items").update(patch).eq("id", itemId);
}

/**
 * Worker process function
 * Job data: { itemId, bulkJobId, mode? }
 */
const worker = new Worker(
  bulkQueueName,
  async (job: Job) => {
    const { itemId, bulkJobId, mode } = job.data as { itemId: string; bulkJobId: string; mode?: "quick" | "full" };
    // fetch item row
    const { data: rows, error } = await supabase.from("bulk_job_items").select("*").eq("id", itemId).limit(1);
    if (error || !rows || !rows.length) throw new Error("item_not_found");
    const item = rows[0] as any;

    const domain = domainFromUrl(item.input_url);
    const domainCount = domainCounts.get(domain) ?? 0;
    if (domainCount >= PER_DOMAIN_LIMIT) {
      // requeue with delay to respect per-domain concurrency
      await job.moveToDelayed(Date.now() + 1000 * 2 * (Math.random() + 1));
      return;
    }

    // mark in_progress (idempotent)
    await updateItem(item.id, { status: "in_progress", started_at: new Date().toISOString(), tries: (item.tries || 0) + 1 });

    domainCounts.set(domain, domainCounts.get(domain) ?? 0 + 1);

    try {
      // create ingestion
      const ingestionId = await createIngestionForItem(item.input_url, item.metadata ?? {});
      await updateItem(item.id, { ingestion_id: ingestionId });

      // start pipeline (use item-specified mode or default)
      const effectiveMode = mode ?? (process.env.BULK_DEFAULT_MODE === "full" ? "full" : "quick");
      const runId = await startPipeline(ingestionId, effectiveMode);
      await updateItem(item.id, { pipeline_run_id: runId });

      // poll pipeline
      const snap = await pollPipeline(runId);

      if (snap?.run?.status === "succeeded") {
        await updateItem(item.id, { status: "succeeded", finished_at: new Date().toISOString() });
      } else {
        await updateItem(item.id, { status: "failed", last_error: snap, finished_at: new Date().toISOString() });
      }
    } catch (err: any) {
      console.error("worker: item processing error", err?.message || err);
      await updateItem(item.id, { status: "failed", last_error: { message: String(err?.message || err), payload: err?.payload ?? null }, finished_at: new Date().toISOString() });
      throw err;
    } finally {
      domainCounts.set(domain, Math.max(0, (domainCounts.get(domain) ?? 1) - 1));
    }
  },
  {
    connection: REDIS,
    concurrency: MAX_CONCURRENCY,
  }
);

worker.on("completed", (job) => {
  console.log("Completed job", job.id);
});

worker.on("failed", (job, err) => {
  console.error("Failed job", job?.id, err?.message ?? err);
});

// graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down bulk worker...");
  await worker.close();
  process.exit(0);
});
