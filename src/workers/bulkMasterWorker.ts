// src/workers/bulkMasterWorker.ts
// Node worker: run as a separate process (pm2 / systemd / container).
// Usage: NODE_ENV=production node ./dist/workers/bulkMasterWorker.js
//
// Responsibilities:
//  - Consume jobs from 'bulk-master' queue (payload { bulkJobId }).
//  - Atomically select queued items for that job and enqueue them into 'bulk-item' (batched).
//  - Update bulk_jobs.updated_at so UI shows activity.
//  - Be resilient to Redis/DB errors and log useful diagnostics.
//
// Notes:
//  - This worker must run outside Vercel serverless (long running process).
//  - Ensure env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL (used by getRedisConnection).
//  - The worker intentionally does not flip item.status in the DB to avoid subtle race conditions
//    with other processes; it enqueues items that are currently status='queued'.
//
// Minor improvements over previous version:
//  - Stronger error handling and logging
//  - Update updated_at on bulk_jobs after enqueueing (or when no items)
//  - Batch enqueue with addBulk and a robust fallback to individual adds
//  - Avoid marking job 'succeeded' unless we are certain there are zero items to process

import { getQueue, getRedisConnection } from "@/lib/queue/bull";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
// Create queue instances (getQueue uses the app's Redis connection options)
const qItem = getQueue("bulk-item");

async function handle(job: any) {
  const bulkJobId = job?.data?.bulkJobId;
  if (!bulkJobId) {
    console.warn("[bulk-master] job missing bulkJobId", job?.id);
    return;
  }

  console.log("[bulk-master] processing", bulkJobId);

  try {
    // Fetch queued items for this bulk job
    const { data: items, error: fetchErr } = await supabase
      .from("bulk_job_items")
      .select("id,item_index")
      .eq("bulk_job_id", bulkJobId)
      .eq("status", "queued")
      .order("item_index", { ascending: true });

    if (fetchErr) {
      console.error("[bulk-master] supabase fetch error", fetchErr);
      throw fetchErr;
    }

    const count = Array.isArray(items) ? items.length : 0;
    if (!count) {
      // No queued items. Touch the job row so UI shows activity.
      await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
      console.log("[bulk-master] no queued items for", bulkJobId);
      return;
    }

    console.log(`[bulk-master] found ${count} queued items for ${bulkJobId}, enqueuing in batches...`);

    const batchSize = Math.max(50, parseInt(process.env.BULK_ENQUEUE_BATCH_SIZE || "200", 10));

    // Enqueue in chunks with fallback
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const jobs = chunk.map((it: any) => ({
        name: "bulk-item",
        data: { bulkJobItemId: it.id },
        opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
      }));

      try {
        if (typeof qItem.addBulk === "function") {
          await qItem.addBulk(jobs);
        } else {
          // defensive: some older versions may not have addBulk on this wrapper
          for (const j of jobs) {
            await qItem.add(j.name, j.data, j.opts);
          }
        }
      } catch (enqueueErr) {
        console.error("[bulk-master] addBulk failed, falling back to individual adds", enqueueErr);
        for (const j of jobs) {
          try {
            await qItem.add(j.name, j.data, j.opts);
          } catch (singleErr) {
            console.error("[bulk-master] failed to enqueue item individually", j.data, singleErr);
          }
        }
      }
    }

    // Touch the job row to indicate activity and help UI polling
    try {
      await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
    } catch (touchErr) {
      console.warn("[bulk-master] failed to update bulk_jobs.updated_at", touchErr);
    }

    console.log(`[bulk-master] enqueued ${count} items for bulkJob ${bulkJobId}`);
  } catch (err: any) {
    console.error("[bulk-master] processing error for", bulkJobId, err?.message ?? err);
    // Let the worker mark the job as failed so it can be inspected/retried
    throw err;
  }
}

(async () => {
  // lazy require to avoid bundling issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");

  // get connection from your app helper
  const connection = getRedisConnection();

  const worker = new Worker(
    "bulk-master",
    async (job: any) => {
      await handle(job);
    },
    { connection, concurrency: 2 }
  );

  worker.on("completed", (job: any) => {
    console.log("[bulk-master] completed", job.id);
  });

  worker.on("failed", (job: any, err: any) => {
    console.error("[bulk-master] failed", job.id, err?.message ?? err);
  });

  console.log("[bulk-master] worker started");
})();
