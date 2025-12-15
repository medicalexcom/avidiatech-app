/**
 * Worker entrypoint for BullMQ job processing.
 * Run this as a standalone process (ts-node in dev or compiled JS in production).
 *
 * Usage (dev):
 *  REDIS_URL=redis://127.0.0.1:6379 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node --transpile-only src/worker/worker.ts
 *
 * In production, run compiled JS on a long-running host (Render, Railway, etc.).
 */

import { Worker } from "bullmq";
import { getRedisConnection } from "../lib/queue/bull";
import { connectorSyncProcessor, importProcessProcessor, pipelineRetryProcessor } from "../lib/imports/workerProcessors";
import Redis from "ioredis";

const redis = getRedisConnection();
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);

console.log("Starting worker with concurrency", concurrency);

const connectorWorker = new Worker(
  "connector-sync",
  async (job: any) => {
    await connectorSyncProcessor(job.data);
    return true;
  },
  { connection: redis, concurrency }
);

const importWorker = new Worker(
  "import-process",
  async (job: any) => {
    await importProcessProcessor(job.data);
    return true;
  },
  { connection: redis, concurrency }
);

const retryWorker = new Worker(
  "pipeline-retry",
  async (job: any) => {
    await pipelineRetryProcessor(job.data);
    return true;
  },
  { connection: redis, concurrency: 1 }
);

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down workers...");
  await connectorWorker.close();
  await importWorker.close();
  await retryWorker.close();
  // close redis if needed
  try {
    await (redis as Redis).quit();
  } catch (e) {
    // ignore
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

connectorWorker.on("failed", (job, err) => {
  console.error("connector-sync job failed", job.id, err);
});
importWorker.on("failed", (job, err) => {
  console.error("import-process job failed", job.id, err);
});
retryWorker.on("failed", (job, err) => {
  console.error("pipeline-retry job failed", job.id, err);
});

console.log("Worker started");
