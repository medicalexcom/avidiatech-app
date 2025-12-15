/**
 * Simple worker that polls monitor_watches and runs due watches.
 *
 * Usage (locally or in a server process):
 *   node -r dotenv/config ./dist/lib/monitor/worker.js
 *
 * or import and call startWorker() in a server environment (PM2, systemd, or a serverless schedule).
 */

import { createClient } from "@supabase/supabase-js";
import { runWatchOnce } from "./core";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function pollOnce() {
  // Find watches due for check (last_check_at is null or older than now - frequency_seconds)
  const now = new Date().toISOString();
  const sql = `
    SELECT *
    FROM public.monitor_watches
    WHERE (last_check_at IS NULL)
       OR (last_check_at + (frequency_seconds || ' seconds')::interval) <= now()
    ORDER BY last_check_at NULLS FIRST
    LIMIT 50;
  `;
  const { data: watches, error } = await supabaseAdmin.rpc("sql", { q: sql }).catch(() => ({ data: null, error: null })) as any;
  // Above uses RPC fallback; if your supabase doesn't accept raw SQL through rpc, switch to JS filtering:
  let list = watches;
  if (!Array.isArray(list)) {
    // fallback: simple select (may not honor frequency exactly)
    const { data } = await supabaseAdmin.from("monitor_watches").select("*").order("last_check_at", { ascending: true }).limit(50);
    list = data ?? [];
  }

  for (const w of list) {
    try {
      console.log(`Checking watch ${w.id} ${w.source_url}`);
      const r = await runWatchOnce(String(w.id));
      console.log("result:", r);
      // Small delay between checks to avoid bursts
      await new Promise((res) => setTimeout(res, 500));
    } catch (err: any) {
      console.error("watch run error", err);
    }
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
