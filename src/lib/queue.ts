import { Queue, QueueScheduler, Worker, Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

export function getRedisConnection() {
  return connection;
}

/**
 * Create/return named Queue and QueueScheduler helpers.
 * Use these in API (producer) and worker (consumer).
 */
export const bulkQueueName = "avida-seo-bulk-queue";

export const bulkQueue = new Queue(bulkQueueName, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 1,
  },
});

export const bulkQueueScheduler = new QueueScheduler(bulkQueueName, { connection });

// Worker is created in scripts/bulkWorker.ts
export { Worker, Job };
