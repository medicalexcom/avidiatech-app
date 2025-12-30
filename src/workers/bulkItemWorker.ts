// src/workers/bulkItemWorker.ts
//
// Bulk item worker: end-to-end per-item processing for bulk jobs.
// - Enforces billing/quota per-item via requireSubscriptionAndUsage.
// - Creates ingestion (POST /api/v1/ingest) if needed and polls ingestion job.
// - Starts pipeline (POST /api/v1/pipeline/run) and polls until completion.
// - Updates bulk_job_items status, last_error, ingestion_id, pipeline_run_id, started_at, finished_at.
// - Updates bulk_jobs counters atomically via incrementBulkCounters helper.
//
// Run this as a separate Node process (pm2 / systemd / container).
// Example (after build): NODE_ENV=production node ./dist/workers/bulkItemWorker.js
//
// Required env:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - REDIS_URL
// - INTERNAL_API_BASE (optional; defaults to empty, used to call internal endpoints)
// - SERVICE_API_KEY (optional; to authenticate internal API calls)
// - BULK_ITEM_CONCURRENCY (optional, default 8)

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { getRedisConnection } from "@/lib/queue/bull";
import { incrementBulkCounters } from "@/lib/bulk/db";
import { requireSubscriptionAndUsage } from "@/lib/billing";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceApiKey = process.env.SERVICE_API_KEY || process.env.NEXT_PUBLIC_SERVICE_API_KEY || "";
const internalApiBase = process.env.INTERNAL_API_BASE || ""; // e.g. https://app.example.com

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/* ---- Helpers ---- */

async function markItem(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("bulk_job_items").update(updates).eq("id", id);
  if (error) {
    console.warn("markItem update error", error);
  }
}

async function fetchItemRow(bulkJobItemId: string) {
  const { data, error } = await supabase.from("bulk_job_items").select("*").eq("id", bulkJobItemId).maybeSingle();
  if (error) throw error;
  return data as any;
}

async function fetchBulkJob(bulkJobId: string) {
  const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", bulkJobId).maybeSingle();
  if (error) throw error;
  return data as any;
}

function serviceHeaders() {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (serviceApiKey) h["x-service-api-key"] = serviceApiKey;
  return h;
}

async function startIngestAndReturnIngestionId(itemUrl: string) {
  const url = `${internalApiBase}/api/v1/ingest`;
  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ url: itemUrl, persist: true, options: { includeSeo: true } }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = j?.error ?? `ingest failed (${res.status})`;
    throw new Error(msg);
  }

  // If ingestionId returned directly
  const possibleIngestionId = j?.ingestionId ?? j?.id ?? j?.data?.id ?? j?.data?.ingestionId ?? null;
  if (possibleIngestionId) {
    if (j?.status === "accepted" || res.status === 202) {
      // need to poll job id
      const jobId = j?.jobId ?? j?.ingestionId ?? possibleIngestionId;
      const ing = await pollForIngestionJob(jobId);
      return ing;
    }
    return possibleIngestionId;
  }

  const jobId = j?.jobId ?? j?.job?.id ?? null;
  if (!jobId) throw new Error("ingest did not return an ingestionId or jobId");
  return await pollForIngestionJob(jobId);
}

async function pollForIngestionJob(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: serviceHeaders(),
    });
    const j = await res.json().catch(() => null);
    if (res.status === 200) {
      return j?.ingestionId ?? j?.id ?? null;
    }
    if (res.status === 409) {
      // terminal error from ingest engine
      const msg = j?.error ?? j?.detail ?? "ingest_engine_error";
      const err: any = new Error(msg);
      err.payload = j;
      throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("ingest job timeout");
}

async function startPipeline(ingestionId: string, steps: string[]) {
  const url = `${internalApiBase}/api/v1/pipeline/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      ingestionId,
      triggerModule: "seo",
      steps,
      options: {},
    }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(j?.error ?? `pipeline start failed (${res.status})`);
  }
  return String(j.pipelineRunId);
}

async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase}/api/v1/pipeline/run/${encodeURIComponent(runId)}`, {
      headers: serviceHeaders(),
    });
    const j = await res.json().catch(() => null);
    if (res.ok && j?.run) {
      const status = j.run.status;
      if (status === "succeeded" || status === "failed") return j;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("pipeline poll timeout");
}

/* ---- Core handler ---- */

async function handleJob(job: any) {
  const { bulkJobItemId } = job.data;
  console.log("[bulk-item] processing", bulkJobItemId);

  // Fetch item row
  const item = await fetchItemRow(bulkJobItemId);
  if (!item) {
    throw new Error("bulk_job_item not found");
  }

  // Fetch bulk job for metadata (created_by, options)
  const bulkJob = await fetchBulkJob(item.bulk_job_id);
  if (!bulkJob) {
    throw new Error("parent bulk_job not found");
  }

  // Mark started
  await markItem(bulkJobItemId, {
    status: "in_progress",
    started_at: new Date().toISOString(),
    tries: (item.tries ?? 0) + 1,
  });

  try {
    // Billing / quota: attempt to consume one ingestion quota for the user who created the bulk job
    try {
      await requireSubscriptionAndUsage({
        userId: bulkJob.created_by,
        requestedTenantId: bulkJob.options?.source_tenant ?? undefined,
        feature: "ingestion" as any, // cast to any to avoid strict type mismatch
        increment: 1,
        userEmail: bulkJob.options?.requested_by_email ?? undefined,
      });
    } catch (usageErr: any) {
      // Out of quota or billing problem: mark item failed and record reason
      console.warn("[bulk-item] quota/usage check failed", { bulkJobItemId, err: usageErr?.message ?? usageErr });
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { message: String(usageErr?.message || usageErr), code: usageErr?.code ?? "quota_failed" },
      });
      // increment failed counter
      try {
        await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
      } catch (incErr) {
        console.warn("incrementBulkCounters failed after quota error", incErr);
      }
      return;
    }

    // Ingestion: create if missing
    let ingestionId = item.ingestion_id ?? null;
    if (!ingestionId) {
      ingestionId = await startIngestAndReturnIngestionId(item.input_url);
      if (!ingestionId) throw new Error("ingestion creation returned no id");
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    // Determine steps (default to extract+seo; allow bulkJob.options.mode === 'full')
    const steps = (bulkJob.options?.mode === "full" || String(bulkJob.options?.mode) === "full") ? ["extract", "seo", "audit", "import", "monitor", "price"] : ["extract", "seo"];

    // Start pipeline
    const pipelineRunId = await startPipeline(ingestionId, steps);
    await markItem(bulkJobItemId, { pipeline_run_id: pipelineRunId });

    // Poll pipeline until terminal
    const snap = await pollPipeline(pipelineRunId);

    const finalStatus = snap?.run?.status;
    if (finalStatus === "succeeded") {
      await markItem(bulkJobItemId, { status: "succeeded", finished_at: new Date().toISOString() });
      try {
        await incrementBulkCounters(item.bulk_job_id, { completed: 1 });
      } catch (incErr) {
        console.warn("incrementBulkCounters failed (completed)", incErr);
      }
    } else {
      // pipeline failed: capture run + modules for diagnostics
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { pipelineStatus: finalStatus, run: snap?.run ?? null, modules: snap?.modules ?? null },
      });
      try {
        await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
      } catch (incErr) {
        console.warn("incrementBulkCounters failed (failed)", incErr);
      }
    }
  } catch (err: any) {
    console.error("[bulk-item] processing error", { bulkJobItemId, error: err?.message ?? err });
    await markItem(bulkJobItemId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: { message: String(err?.message || err) },
    });
    try {
      await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
    } catch (incErr) {
      console.warn("incrementBulkCounters failed on exception", incErr);
    }
  }
}

/* ---- Worker bootstrap ---- */

(async () => {
  // Lazy require to avoid bundling issues if this file is imported in Next runtime
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");

  const connection = getRedisConnection();
  const concurrency = parseInt(process.env.BULK_ITEM_CONCURRENCY || "8", 10);

  const worker = new Worker(
    "bulk-item",
    async (job: any) => {
      await handleJob(job);
    },
    {
      connection,
      concurrency,
    }
  );

  worker.on("completed", (job: any) => {
    console.log(`[bulk-item] completed ${job.id}`);
  });

  worker.on("failed", (job: any, err: any) => {
    console.error(`[bulk-item] failed ${job.id}`, err?.message ?? err);
  });

  console.log(`[bulk-item] worker started (concurrency=${concurrency})`);
})();
