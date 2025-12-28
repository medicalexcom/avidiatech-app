/**
 * Canonical queue helper for the app.
 *
 * This file centralizes BullMQ usage and exposes:
 *  - getQueue(name): lazily create/return a Queue instance (requires 'bullmq' at runtime)
 *  - getRedisConnection(): shared ioredis connection
 *  - bulkQueueName + getBulkQueue(): convenience for a canonical bulk queue
 *
 * Implementation intentionally avoids static `import { Queue } from 'bullmq'` at module top-level
 * to prevent Next.js/Turbopack from type-checking/resolving bullmq during build time.
 * It uses require() inside getQueue(), which defers require to runtime (worker/process).
 *
 * Ensure REDIS_URL is set in env when starting workers or calling getQueue().
 */

import Redis from "ioredis";

let _redis: Redis | null = null;
const queues: Record<string, any> = {};

function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    // If Redis isn't required in a given runtime (e.g. during some static builds),
    // throw a clear error only when someone actually tries to use the connection.
    throw new Error("REDIS_URL not set for BullMQ queue helper");
  }
  _redis = new Redis(url);
  return _redis;
}

/**
 * Lazily require bullmq and return a Queue instance for the provided name.
 * This function uses require() to avoid static imports that trigger TS/bundler errors.
 */
export function getQueue(name: string) {
  if (queues[name]) return queues[name];

  // Require bullmq at runtime — avoids build-time type resolution issues in Next.js.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bullmq = require("bullmq");
  const Queue = bullmq.Queue;

  const connection = getRedis();
  const q = new Queue(name, { connection });
  queues[name] = q;
  return q;
}

/**
 * Return the underlying ioredis connection instance.
 * Caller should ensure REDIS_URL is present in env.
 */
export function getRedisConnection() {
  return getRedis();
}

/* Convenience exports for the bulk queue name used by the SEO bulk flow */
export const bulkQueueName = "avida-seo-bulk-queue";

export function getBulkQueue() {
  return getQueue(bulkQueueName);
}
