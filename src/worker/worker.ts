*** Begin Patch
*** Update File: src/worker/worker.ts
@@
-import { Worker } from "bullmq";
-import { getRedisConnection } from "../lib/queue/bull";
-import { connectorSyncProcessor, importProcessProcessor, pipelineRetryProcessor } from "../lib/imports/workerProcessors";
-import Redis from "ioredis";
+import { Worker } from "bullmq";
+import { getRedisConnection } from "../lib/queue/bull";
+import { connectorSyncProcessor, importProcessProcessor, pipelineRetryProcessor } from "../lib/imports/workerProcessors";
+import Redis from "ioredis";
+import { initSentry } from "../lib/sentry/server";
 
 const redis = getRedisConnection();
 const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);
 
 console.log("Starting worker with concurrency", concurrency);
+// Init Sentry if configured (for worker errors)
+initSentry();
*** End Patch
