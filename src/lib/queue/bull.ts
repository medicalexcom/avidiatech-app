/**
 * BullMQ helper: creates shared Redis connection and returns queues.
 * Requires REDIS_URL in env.
 *
 * This file is intentionally defensive because we've observed REDIS_URL being contaminated
 * with ANSI color escape sequences and/or a leading '//' (scheme-relative URL) in some runtimes,
 * which causes ioredis to throw ERR_INVALID_URL.
 *
 * Also: BullMQ requires ioredis option maxRetriesPerRequest to be null.
 */

import Redis from "ioredis";

let _redis: Redis | null = null;
const queues: Record<string, any> = {};

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function sanitizeRedisUrl(raw: string | undefined): string {
  if (!raw) return "";

  // 1) strip ANSI escape codes + trim whitespace/newlines
  let s = String(raw).replace(ANSI_REGEX, "").trim();

  // 2) if we ever see a scheme-relative URL prefix, normalize it
  //    (we've seen runtime inputs like "//\x1b[32mrediss://...")
  while (s.startsWith("//")) s = s.slice(2).trim();

  // 3) ensure it has a scheme; Upstash typically uses rediss://
  if (s && !/^rediss?:\/\//i.test(s)) {
    s = `redis://${s}`;
  }

  return s;
}

function safePreviewRedisUrl(url: string) {
  // Avoid leaking credentials in logs
  return url.replace(/\/\/([^:]+):([^@]+)@/i, "//$1:***@");
}

function getRedis() {
  if (_redis) return _redis;

  const url = sanitizeRedisUrl(process.env.REDIS_URL);
  if (!url) throw new Error("REDIS_URL not set for BullMQ queue helper");

  if (process.env.DEBUG_BULLMQ) {
    console.log("[bullmq] REDIS_URL preview:", safePreviewRedisUrl(url).slice(0, 120));
  }

  // BullMQ requirement: maxRetriesPerRequest MUST be null.
  _redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  _redis.on("error", (err) => {
    console.error("[bullmq] redis error:", err?.message ?? err);
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
