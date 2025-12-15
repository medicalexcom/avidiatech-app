"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";

/**
 * Enhanced Monitor page
 *
 * - Renders the marketing/overview UI + interactive MonitorDashboard.
 * - Adds a lightweight summary panel that fetches watches & events counts,
 *   shows most-recent events, and exposes quick actions (Add watch anchor, Run check).
 * - Displays a reference list of the server-side files added for Monitor so
 *   operators/developers know where to look (migrations, core, worker, api routes).
 *
 * Drop this file at: src/app/dashboard/monitor/page.tsx
 *
 * Notes:
 * - The page calls:
 *   - GET /api/monitor/watches
 *   - GET /api/monitor/events
 *   - POST /api/monitor/check (via MonitorDashboard)
 * - Ensure the API routes and env vars described in docs are present.
 */

function StatCard({ title, value, caption }: { title: string; value: React.ReactNode; caption?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {caption ? <div className="mt-1 text-xs text-slate-400">{caption}</div> : null}
    </div>
  );
}

export default function MonitorPage() {
  const [watches, setWatches] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [lastCheckSample, setLastCheckSample] = useState<any | null>(null);

  // list of files we added for Monitor (helpful reference)
  const addedFiles = useMemo(
    () => [
      "supabase/migrations/0001_create_monitor_tables.sql",
      "src/lib/monitor/core.ts",
      "src/lib/monitor/worker.ts",
      "src/app/api/monitor/watches/route.ts",
      "src/app/api/monitor/events/route.ts",
      "src/app/api/monitor/check/route.ts",
      "src/components/monitor/MonitorDashboard.tsx",
    ],
    []
  );

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const [wRes, eRes] = await Promise.all([fetch("/api/monitor/watches"), fetch("/api/monitor/events")]);
      const wJson = await wRes.json().catch(() => null);
      const eJson = await eRes.json().catch(() => null);
      const wList = wRes.ok && wJson?.ok ? wJson.watches ?? [] : [];
      const eList = eRes.ok && eJson?.ok ? eJson.events ?? [] : [];
      setWatches(wList);
      setEvents(eList);
      setLastCheckSample(eList?.[0] ?? null);
    } catch (err) {
      setWatches([]);
      setEvents([]);
      setLastCheckSample(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
    const t = setInterval(() => loadSummary(), 30_000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const watchesCount = watches?.length ?? "—";
  const eventsCount24h = events
    ? events.filter((ev) => {
        const t = new Date(ev.created_at).getTime();
        return Date.now() - t < 24 * 60 * 60 * 1000;
      }).length
    : "—";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-400/24 blur-3xl dark:bg-amber-500/25" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-400/22 blur-3xl dark:bg-emerald-500/22" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              Commerce · AvidiaMonitor
            </div>
            <h1 className="mt-3 text-2xl font-semibold">Monitor — change detection & automation</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Watch product sources, detect deltas, and trigger pipelines or alerts. Use the workspace below to manage watches,
              inspect events, and run checks on-demand.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                const url = "#add-watch";
                const el = document.querySelector(url);
                if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:opacity-95"
            >
              Add watch
            </button>
            <button
              onClick={() => {
                const el = document.querySelector("div[data-monitor-dashboard]");
                if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
                else window.scrollTo({ top: 400, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            >
              Open workspace
            </button>
          </div>
        </header>

        {/* Summary + workspace */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard title="Watches" value={loadingSummary ? "…" : watchesCount} caption="Configured watches" />
              <StatCard title="Events (24h)" value={loadingSummary ? "…" : eventsCount24h} caption="Events detected in last 24 hours" />
              <StatCard
                title="Last event"
                value={lastCheckSample ? new Date(lastCheckSample.created_at).toLocaleString() : "—"}
                caption={lastCheckSample ? `${lastCheckSample.event_type} · ${lastCheckSample?.payload?.diff ? "diff present" : "no diff"}` : "No recent events"}
              />
            </div>

            {/* Interactive dashboard */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow dark:border-slate-800 dark:bg-slate-950/55">
              <div data-monitor-dashboard>
                <MonitorDashboard />
              </div>
            </div>

            {/* Recent events inline preview */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow dark:border-slate-800 dark:bg-slate-950/55">
              <h3 className="text-sm font-semibold">Recent monitor events</h3>
              <p className="text-xs text-slate-500 mt-1">A quick view of the most recent events captured by Monitor.</p>
              <div className="mt-3 space-y-2">
                {events === null ? (
                  <div className="text-sm text-slate-500">Loading…</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-slate-500">No events yet. Add a watch and run a check.</div>
                ) : (
                  events.slice(0, 6).map((ev) => (
                    <div key={ev.id} className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/40">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs text-slate-500">{ev.event_type}</div>
                          <div className="font-medium">{ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url ?? "Event"}</div>
                          <div className="text-xs text-slate-400 truncate">{ev.payload?.snapshot?.url}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">{new Date(ev.created_at).toLocaleString()}</div>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(JSON.stringify(ev.payload ?? ev, null, 2));
                              alert("Event payload copied");
                            }}
                            className="mt-2 rounded px-2 py-1 text-xs border"
                          >
                            Copy payload
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column: quick actions & developer files */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow dark:border-slate-800 dark:bg-slate-950/55">
              <h3 className="text-sm font-semibold">Quick actions</h3>
              <p className="text-xs text-slate-500 mt-1">Admin utilities for Monitor</p>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Run all due checks</div>
                    <div className="text-sm font-medium">Poll worker (manual)</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // best-effort: call the worker RPC if you expose one (not implemented by default).
                        // For now we just reload summary which will show new events after worker runs.
                        await fetch("/api/monitor/watches");
                        alert("Triggered summary refresh — run worker separately (see README).");
                        loadLocalSummary();
                      } catch {
                        alert("Trigger failed — ensure worker is running or run it manually.");
                      }
                    }}
                    className="rounded px-3 py-1 text-xs border"
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Start worker (dev)</div>
                    <div className="text-sm font-medium">Run locally</div>
                  </div>
                  <button
                    onClick={() =>
                      alert(
                        "Dev command:\n\nNODE_ENV=production node -r dotenv/config ./dist/lib/monitor/worker.js\n\nRun this in a server process (PM2, systemd, or Docker)."
                      )
                    }
                    className="rounded px-3 py-1 text-xs border"
                  >
                    Show command
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Trigger single check</div>
                    <div className="text-sm font-medium">From Monitor workspace</div>
                  </div>
                  <a href="#add-watch" className="rounded px-3 py-1 text-xs border">
                    Add / Check
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/40">
              <div className="font-semibold">Files added for Monitor</div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                The following server & client files were added. See them to customize behavior.
              </div>
              <ul className="mt-2 space-y-1">
                {addedFiles.map((f) => (
                  <li key={f} className="flex items-center justify-between gap-2">
                    <code className="truncate text-[11px]">{f}</code>
                    <a
                      href={`https://github.com/medicalexcom/avidiatech-app/blob/main/${f}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-600 hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-500">
                Note: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment and run the worker process to enable scheduled checks.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/55">
              <div className="font-semibold">Operational tips</div>
              <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                <li>Start small: monitor a seed of important SKUs first.</li>
                <li>Set frequency per vendor to avoid rate-limits.</li>
                <li>Use Monitor events to trigger Price or Import modules selectively.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );

  // local helper used in quick action — defined here to avoid moving hooks
  async function loadLocalSummary() {
    try {
      const [wRes, eRes] = await Promise.all([fetch("/api/monitor/watches"), fetch("/api/monitor/events")]);
      const wJson = await wRes.json().catch(() => null);
      const eJson = await eRes.json().catch(() => null);
      setWatches(wRes.ok && wJson?.ok ? wJson.watches ?? [] : []);
      setEvents(eRes.ok && eJson?.ok ? eJson.events ?? [] : []);
      setLastCheckSample(eJson?.events?.[0] ?? null);
    } catch {
      // noop
    }
  }
}
