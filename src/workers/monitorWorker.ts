import { getRedisConnection } from "@/lib/queue/bull";
import { getServerSupabase } from "@/lib/supabase";
import { computeHashes, createSnapshotFromUrl } from "@/lib/monitor/snapshot";
import { diffSnapshots } from "@/lib/monitor/diff";

function minutesToMs(m: number) {
  return Math.max(1, m) * 60_000;
}

function jitterMs(maxMinutes: number) {
  return Math.floor(Math.random() * maxMinutes * 60_000);
}

async function handle(job: any) {
  const tenantId = job?.data?.tenant_id;
  const watchId = job?.data?.watch_id;
  if (!tenantId || !watchId) throw new Error("missing tenant_id/watch_id");

  const supabase = getServerSupabase();

  // Load watch
  const { data: watch, error: wErr } = await supabase
    .from("monitor_watchlist")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", watchId)
    .maybeSingle();

  if (wErr) throw new Error(`watch_load_failed:${wErr.message}`);
  if (!watch) return;

  if (watch.status !== "active") return;

  // Load latest snapshot
  const { data: prevSnapRow } = await supabase
    .from("monitor_snapshots")
    .select("snapshot")
    .eq("tenant_id", tenantId)
    .eq("watch_id", watchId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const before = (prevSnapRow?.snapshot ?? null) as any;

  try {
    const { snapshot, fetchMs } = await createSnapshotFromUrl(watch.url_norm);

    const hashes = computeHashes(snapshot);

    // Persist snapshot
    const insSnap = await supabase.from("monitor_snapshots").insert([
      {
        tenant_id: tenantId,
        watch_id: watchId,
        fetch_ms: fetchMs,
        snapshot,
        hashes,
        http_status: 200,
      },
    ]);

    if (insSnap.error) throw new Error(`snapshot_insert_failed:${insSnap.error.message}`);

    const diff = diffSnapshots({ before, after: snapshot, policy: watch.policy });

    const nowIso = new Date().toISOString();

    // Determine next schedule (frequency + jitter)
    const freqMin = Number(watch.frequency_minutes ?? 10080);
    const nextRun = new Date(Date.now() + minutesToMs(freqMin) + jitterMs(5)).toISOString();

    // Update watchlist run markers
    await supabase
      .from("monitor_watchlist")
      .update({
        last_checked_at: nowIso,
        next_run_at: nextRun,
        status: "active",
        error_count: 0,
        last_error: null,
        last_changed_at: diff.changed ? nowIso : (watch.last_changed_at ?? null),
      })
      .eq("tenant_id", tenantId)
      .eq("id", watchId);

    if (diff.changed) {
      // Insert one event per changeType (keeps feed readable and filters simple)
      for (const ct of diff.changeTypes) {
        const eventType =
          ct === "price" ? "price_change" :
          ct === "seo" ? "seo_change" :
          ct === "specs" ? "spec_change" :
          ct === "manuals" ? "manuals_change" :
          ct === "images" ? "images_change" :
          "variants_change";

        const triggered_actions = {
          pipeline: diff.suggestedAction, // "seo_only"|"full"|"none"
          import: false,
          notified: false,
          note: "pipeline trigger not executed yet (PIPELINE_RUNNER_SECRET header not configured)",
        };

        const insEvt = await supabase.from("monitor_events").insert([
          {
            tenant_id: tenantId,
            watch_id: watchId,
            event_type: eventType,
            severity: diff.severity,
            summary: diff.summary,
            diff: diff.diff,
            triggered_actions,
            pipeline_run_id: null,
          },
        ]);

        if (insEvt.error) throw new Error(`event_insert_failed:${insEvt.error.message}`);
      }
    }
  } catch (err: any) {
    const msg = String(err?.message ?? err);

    const nowIso = new Date().toISOString();
    const newErrCount = Number(watch.error_count ?? 0) + 1;

    // Basic backoff on failure
    const backoffMin = Math.min(60, 5 * newErrCount);
    const nextRun = new Date(Date.now() + minutesToMs(backoffMin) + jitterMs(3)).toISOString();

    await supabase
      .from("monitor_watchlist")
      .update({
        last_checked_at: nowIso,
        next_run_at: nextRun,
        error_count: newErrCount,
        last_error: msg,
        status: newErrCount >= 10 ? "paused" : "error",
      })
      .eq("tenant_id", tenantId)
      .eq("id", watchId);

    await supabase.from("monitor_events").insert([
      {
        tenant_id: tenantId,
        watch_id: watchId,
        event_type: "fetch_error",
        severity: newErrCount >= 5 ? "warning" : "info",
        summary: `Fetch error: ${msg}`.slice(0, 5000),
        diff: { error: msg },
        triggered_actions: { pipeline: "none", import: false, notified: false },
      },
    ]);

    throw err;
  }
}

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");

  const connection = getRedisConnection();

  const concurrency = Math.max(1, Number(process.env.MONITOR_WORKER_CONCURRENCY ?? 4));

  const worker = new Worker(
    "monitor:crawl",
    async (job: any) => {
      await handle(job);
    },
    { connection, concurrency }
  );

  worker.on("completed", (job: any) => console.log("[monitor] completed", job.id));
  worker.on("failed", (job: any, err: any) => console.error("[monitor] failed", job?.id, err?.message ?? err));

  console.log("[monitor] worker started (queue=monitor:crawl, concurrency=" + concurrency + ")");
})();
