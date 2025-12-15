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
 * Install dependencies before using:
 *   npm install bullmq ioredis
 */

let _queues: Record<string, any> = {};

export function getQueue(name: string) {
  if (_queues[name]) return _queues[name];

  // Dynamic require so builds that don't include bullmq until you install it won't fail at import-time in some tools.
  // The user must install bullmq and ioredis before attempting to actually run queue operations.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Queue } = require("bullmq");

  const connection = process.env.REDIS_URL
    ? { connection: process.env.REDIS_URL }
    : { connection: { host: "127.0.0.1", port: 6379 } };

  // Depending on bullmq version the constructor accepts either connection or options, adapt if needed.
  const q = new Queue(name, connection.connection ? connection : { connection });
  _queues[name] = q;
  return q;
}
