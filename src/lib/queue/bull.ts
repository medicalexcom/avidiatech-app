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

function getRedis() {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not set for BullMQ queue helper");
  _redis = new Redis(url);
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
