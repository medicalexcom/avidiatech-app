/**
 * Worker: select watches and consider next_check_at before running.
 * Replace previous getDueWatches logic with this version.
 */

import { createClient } from "@supabase/supabase-js";
import { runWatchOnce } from "./core";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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
    // if next_check_at present, require it to be <= now
    if (w.next_check_at) {
      const next = new Date(w.next_check_at).getTime();
      if (next > now) return false;
    }
    if (!w.last_check_at) return true;
    const last = new Date(w.last_check_at).getTime();
    return last + freq * 1000 <= now;
  });
  return due;
}

// the rest of worker unchanged
export async function pollOnce() {
  try {
    const dueWatches = await getDueWatches(200);
    if (!dueWatches.length) return;
    for (const w of dueWatches) {
      try {
        console.log(`Monitor worker: checking watch ${w.id} ${w.source_url}`);
        const r = await runWatchOnce(String(w.id));
        console.log("Monitor worker result:", r);
      } catch (err: any) {
        console.error(`Error running watch ${w?.id}:`, err);
      }
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
