/**
 * Minimal BullMQ helper to create caches for queues.
 *
 * Requires:
 * - process.env.REDIS_URL to be set (e.g. redis://localhost:6379)
 *
 * Usage:
 *   import { getQueue } from "@/lib/queue/bull";
 *   const q = getQueue("connector-sync");
 *   await q.add("connector-sync", {...});
 *
 * Note: This file uses dynamic import to avoid build-time errors if bullmq is not installed.
 * Install dependencies: npm install bullmq ioredis
 */

let _queues: Record<string, any> = {};

export function getQueue(name: string) {
  if (_queues[name]) return _queues[name];

  // dynamic import to avoid static type error if not installed in some setups
  // — the user must install bullmq and ioredis before running queue code
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Queue } = require("bullmq");

  const connection = { connection: process.env.REDIS_URL || { host: "127.0.0.1", port: 6379 } };
  const q = new Queue(name, connection);
  _queues[name] = q;
  return q;
}
