/**
 * BullMQ helper: creates shared Redis connection and returns queues.
 * Requires REDIS_URL in env.
 *
 * Usage:
 *  const q = getQueue('connector-sync');
 *  await q.add('connector-sync', { integrationId, jobId });
 */

import Redis from "ioredis";

let _redis: Redis | null = null;
const queues: Record<string, any> = {};

/**
 * Strip ANSI escape codes and trim whitespace/newlines.
 * This prevents env contamination (e.g. "\x1b[32mrediss://...\x1b[39m") from breaking ioredis URL parsing.
 */
function sanitizeEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .trim();
}

function getRedis() {
  if (_redis) return _redis;

  const url = sanitizeEnv(process.env.REDIS_URL);
  if (!url) throw new Error("REDIS_URL not set for BullMQ queue helper");

  // BullMQ requires maxRetriesPerRequest=null in ioredis options.
  _redis = new Redis(url, { maxRetriesPerRequest: null });

  return _redis;
}

export function getQueue(name: string) {
  if (queues[name]) return queues[name];
  // import here to avoid bundler/build-time issues if not installed in some contexts
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Queue } = require("bullmq");
  const connection = getRedis();
  const q = new Queue(name, { connection });
  queues[name] = q;
  return q;
}

export function getRedisConnection() {
  return getRedis();
}
