/**
 * Notifier worker
 *
 * - Periodically polls monitor_events where processed = false and calls notifier.processPendingEvents.
 * - Run this as a separate background worker (PM2, systemd, Docker container).
 *
 * Usage:
 * NODE_ENV=production node -r dotenv/config ./dist/lib/monitor/notifierWorker.js
 */

import { processPendingEvents } from "./notifier";

async function start(loopMs = 5000) {
  console.log("Notifier worker starting; polling every", loopMs, "ms");
  while (true) {
    try {
      const res = await processPendingEvents(50);
      if (res?.processed) console.log("notifier processed:", res.processed);
    } catch (err:any) {
      console.error("notifier worker error:", err);
    }
    await new Promise((res) => setTimeout(res, loopMs));
  }
}

if (require.main === module) {
  start(5000).catch((e) => {
    console.error("notifier worker fatal:", e);
    process.exit(1);
  });
}
