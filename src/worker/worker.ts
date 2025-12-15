import { Worker } from "bullmq";
import { getRedisConnection } from "../lib/queue/bull";
import {
  connectorSyncProcessor,
  importProcessProcessor,
  pipelineRetryProcessor,
} from "../lib/imports/workerProcessors";
import { initSentry, captureException } from "../lib/sentry/server";

const redisConnection = getRedisConnection();
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);

console.log("Starting worker with concurrency", concurrency);

// Initialize Sentry (no-op if not configured)
initSentry();

// Create workers for queues. Each Worker will call the corresponding processor.
// If your processors throw, capture to Sentry and rethrow so BullMQ can handle retries.

new Worker(
  "connector-sync",
  async (job) => {
    try {
      await connectorSyncProcessor(job.data as any);
    } catch (err) {
      captureException(err);
      throw err;
    }
  },
  { connection: redisConnection, concurrency }
);

new Worker(
  "import-process",
  async (job) => {
    try {
      await importProcessProcessor(job.data as any);
    } catch (err) {
      captureException(err);
      throw err;
    }
  },
  { connection: redisConnection, concurrency }
);

new Worker(
  "pipeline-retry",
  async (job) => {
    try {
      await pipelineRetryProcessor(job.data as any);
    } catch (err) {
      captureException(err);
      throw err;
    }
  },
  { connection: redisConnection, concurrency }
);

// Global handlers for unexpected errors in the worker process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection in worker:", reason);
  captureException(reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception in worker:", err);
  captureException(err);
  // Optionally exit in production to allow container restart
  // process.exit(1);
});
