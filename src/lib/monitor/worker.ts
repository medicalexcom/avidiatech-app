/**
 * Monitor worker (updated)
 *
 * - Queries monitor_watches via the PostgREST client (no raw RPC).
 * - Filters watches client-side to find those due for checking (avoids using `.rpc("sql", ...)`).
 * - Calls runWatchOnce for each due watch with a small delay to avoid bursts.
 *
 * Replace the previous worker file with this version to fix the TypeScript build error
 * caused by calling `.catch()` on the RPC builder.
 */

import { createClient } from "@supabase/supabase-js";
import { runWatchOnce } from "./core";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * Fetch candidate watches and return those that are due for a check.
 * We fetch a page of watches ordered by last_check_at and then compute due status client-side.
 */
async function getDueWatches(limit = 200) {
  const { data, error } = await supabaseAdmin
    .from("monitor_watches")
    .select("*")
    .order("last_check_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to load monitor_watches:", error);
    return [];
  }
  const now = Date.now();
  const list = Array.isArray(data) ? data : [];
  const due = list.filter((w: any) => {
    const freq = Number(w.frequency_seconds ?? 86400);
    if (!w.last_check_at) return true;
    const last = new Date(w.last_check_at).getTime();
    return last + freq * 1000 <= now;
  });
  return due;
}

export async function pollOnce() {
  try {
    const dueWatches = await getDueWatches(200);
    if (!dueWatches.length) {
      // nothing due right now
      return;
    }

    for (const w of dueWatches) {
      try {
        // run the watch (updates events and watch row)
        console.log(`Monitor worker: checking watch ${w.id} ${w.source_url}`);
        const r = await runWatchOnce(String(w.id));
        console.log("Monitor worker result:", r);
      } catch (err: any) {
        console.error(`Error running watch ${w?.id}:`, err);
      }
      // polite delay between checks
      await new Promise((res) => setTimeout(res, 300));
    }
  } catch (err: any) {
    console.error("pollOnce unexpected error:", err);
  }
}

export async function startWorker(loopIntervalMs = 60_000) {
  console.log("Monitor worker starting (interval ms):", loopIntervalMs);
  while (true) {
    try {
      await pollOnce();
    } catch (err: any) {
      console.error("pollOnce error:", err);
    }
    await new Promise((res) => setTimeout(res, loopIntervalMs));
  }
}

// If run directly (node ./dist/lib/monitor/worker.js), start worker
if (require.main === module) {
  (async () => {
    try {
      await startWorker(60_000);
    } catch (err) {
      console.error("worker failed:", err);
      process.exit(1);
    }
  })();
}
