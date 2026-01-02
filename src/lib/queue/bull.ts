/**
 * BullMQ helper: creates shared Redis connection and returns queues.
 * Requires REDIS_URL in env.
 *
 * Goals:
 * - Prevent invisible ANSI escape sequences in env from breaking ioredis URL parsing.
 * - Ensure BullMQ-compatible ioredis options (maxRetriesPerRequest must be null).
 * - Reuse a single Redis connection across queues in-process.
 */

import Redis from "ioredis";

let _redis: Redis | null = null;
const queues: Record<string, any> = {};

function sanitizeRedisUrl(raw: string | undefined): string {
  if (!raw) return "";

  // 1) strip ANSI escape codes and trim
  let s = String(raw)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .trim();

  // 2) In some cases logs showed the input as starting with "//" before "rediss://".
  //    This makes Node's URL parser treat it as a scheme-relative URL, which ioredis rejects.
  //    Normalize it back to a proper scheme.
  if (s.startsWith("//")) {
    s = s.slice(2);
  }

  // 3) Ensure it has a scheme (Upstash typically uses rediss://)
  //    If someone provides host:port, prepend redis:// as a last-resort.
  if (!/^rediss?:\/\//i.test(s) && s.length > 0) {
    s = `redis://${s}`;
  }

  return s;
}

function getRedis() {
  if (_redis) return _redis;

  const url = sanitizeRedisUrl(process.env.REDIS_URL);
  if (!url) throw new Error("REDIS_URL not set for BullMQ queue helper");

  if (process.env.DEBUG_BULLMQ) {
    // Do not log secrets; only log scheme + host-ish prefix
    const safePreview = url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
    // keep it short
    console.log("[bullmq] using REDIS_URL:", safePreview.slice(0, 80));
  }

  // BullMQ requires: maxRetriesPerRequest = null
  _redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  // Helpful to surface connection problems early
  _redis.on("error", (err) => {
    console.error("[bullmq] redis connection error:", err?.message ?? err);
  });

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
