"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";

/**
 * Monitor dashboard page (metrics update)
 *
 * - Renamed Admin metrics card to "Monitor Metrics"
 * - Added a set of non-duplicative operational metrics:
 *   - % of watches auto-created (auto_watch)
 *   - % of watches linked to products (product linkage)
 *   - avg retry_count across watches
 *   - notifications (last 7 days)
 * - Removed the Manage rules / View notifications buttons from the metrics card.
 * - Quick Actions remain unchanged.
 */

function StatCard({ title, value, caption }: { title: string; value: React.ReactNode; caption?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950/55">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {caption ? <div className="mt-1 text-xs text-slate-400">{caption}</div> : null}
    </div>
  );
}

export default function MonitorPage() {
  const [watches, setWatches] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[] | null>(null);
  const [rules, setRules] = useState<any[] | null>(null);
  const [notifications, setNotifications] = useState<any[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [lastCheckSample, setLastCheckSample] = useState<any | null>(null);

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const [wRes, eRes, rRes, nRes] = await Promise.all([
        fetch("/api/monitor/watches"),
        fetch("/api/monitor/events"),
        fetch("/api/monitor/rules"),
        fetch("/api/monitor/notifications"),
      ]);
      const wJson = await wRes.json().catch(() => null);
      const eJson = await eRes.json().catch(() => null);
      const rJson = await rRes.json().catch(() => null);
      const nJson = await nRes.json().catch(() => null);

      const wList = wRes.ok && wJson?.ok ? wJson.watches ?? [] : [];
      const eList = eRes.ok && eJson?.ok ? eJson.events ?? [] : [];
      const rList = rRes.ok && rJson?.ok ? rJson.rules ?? [] : [];
      const nList = nRes.ok && nJson?.ok ? nJson.notifications ?? [] : [];

      setWatches(wList);
      setEvents(eList);
      setRules(rList);
      setNotifications(nList);
      setLastCheckSample(eList?.[0] ?? null);
    } catch (err) {
      setWatches([]);
      setEvents([]);
      setRules([]);
      setNotifications([]);
      setLastCheckSample(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
    const t = setInterval(() => loadSummary(), 30_000);
    return () => clearInterval(t);
  }, []);

  const watchesCount = watches?.length ?? "—";
  const eventsCount24h = events
    ? events.filter((ev) => {
        const t = new Date(ev.created_at).getTime();
        return Date.now() - t < 24 * 60 * 60 * 1000;
      }).length
    : "—";

  const avgFrequencyDays = useMemo(() => {
    if (!watches || watches.length === 0) return "—";
    const totalDays = watches.reduce((acc, w) => {
      const secs = Number(w.frequency_seconds ?? 86400);
      return acc + secs / (24 * 60 * 60);
    }, 0);
    return Math.round((totalDays / watches.length) * 10) / 10;
  }, [watches]);

  const failingWatchesCount = useMemo(() => {
    if (!watches) return "—";
    return watches.filter((w) => (w.last_status && String(w.last_status) !== "ok") || Number(w.retry_count ?? 0) > 0).length;
  }, [watches]);

  const eventsPerDayEstimate = useMemo(() => {
    if (!events) return "—";
    const last7 = events.filter((ev) => {
      const t = new Date(ev.created_at).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return Math.round((last7 / 7) * 10) / 10;
  }, [events]);

  // New non-duplicative metrics:
  const notificationsLast7Days = useMemo(() => {
    if (!notifications) return "—";
    const cnt = notifications.filter((n) => {
      const t = new Date(n.created_at).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return cnt;
  }, [notifications]);

  const processedEventRatePercent = useMemo(() => {
    if (!events || events.length === 0) return "—";
    const processed = events.filter((ev) => ev.processed === true).length;
    return Math.round((processed / events.length) * 100);
  }, [events]);

  const autoWatchPercent = useMemo(() => {
    if (!watches || watches.length === 0) return "—";
    const aut = watches.filter((w) => !!w.auto_watch).length;
    return Math.round((aut / watches.length) * 100);
  }, [watches]);

  const productLinkedPercent = useMemo(() => {
    if (!watches || watches.length === 0) return "—";
    const linked = watches.filter((w) => !!w.product_id).length;
    return Math.round((linked / watches.length) * 100);
  }, [watches]);

  const avgRetryCount = useMemo(() => {
    if (!watches || watches.length === 0) return "—";
    const total = watches.reduce((acc, w) => acc + Number(w.retry_count ?? 0), 0);
    return Math.round((total / watches.length) * 10) / 10;
  }, [watches]);

  const unreadNotificationsCount = notifications ? notifications.filter((n) => !n.read).length : "—";
  const rulesCount = rules?.length ?? "—";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-50">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-600 shadow-sm">
              Commerce · AvidiaMonitor
            </div>
            <h1 className="mt-3 text-2xl font-bold">Monitor — change detection, notifications & automation</h1>
            <p className="mt-1 text-sm text-slate-600">Watch product sources, detect deltas, and trigger pipelines or alerts. Manage watches, rules, and notifications here.</p>
          </div>

          <div className="flex gap-3">
            <a href="#add-watch" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow">Add watch</a>
            <a href="/dashboard/monitor/rules" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">Rules ({rulesCount})</a>
            <a href="/dashboard/monitor/notifications" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">Notifications ({unreadNotificationsCount})</a>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <StatCard title="Watches" value={loadingSummary ? "…" : watchesCount} caption="Configured watches" />
              <StatCard title="Events (24h)" value={loadingSummary ? "…" : eventsCount24h} caption="Events in last 24 hours" />
              <StatCard title="Avg frequency (days)" value={loadingSummary ? "…" : avgFrequencyDays} caption="Average check frequency" />
              <StatCard title="Failing watches" value={loadingSummary ? "…" : failingWatchesCount} caption="Watches with errors/retries" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <MonitorDashboard />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent monitor events</h3>
                <div className="text-xs text-slate-500">Most recent</div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Quick view of recent events. Use Rules to automate alerts and Notifier to deliver webhooks / emails.</p>

              <div className="mt-3 space-y-2">
                {events === null ? (
                  <div className="text-sm text-slate-500">Loading…</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-slate-500">No events yet — add a watch or upload/import a product to get started.</div>
                ) : (
                  events.slice(0, 8).map((ev) => (
                    <div key={ev.id} className="rounded-lg border p-3 bg-slate-50 flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">{ev.event_type} · {ev.severity}</div>
                        <div className="font-medium truncate">{ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url ?? "Event"}</div>
                        <div className="text-xs text-slate-400 truncate mt-1">{ev.payload?.snapshot?.url}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500">{new Date(ev.created_at).toLocaleString()}</div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(ev.payload ?? ev, null, 2)); alert("Event payload copied"); }} className="rounded px-2 py-1 text-xs border">Copy</button>
                          <a href="/dashboard/monitor/notifications" className="rounded px-2 py-1 text-xs border">Notifications</a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <h3 className="text-sm font-semibold">Quick actions</h3>
              <p className="text-xs text-slate-500 mt-1">Admin utilities for Monitor</p>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Run all due checks</div>
                    <div className="text-sm font-medium">Worker (manual)</div>
                  </div>
                  <button onClick={() => { loadSummary(); alert("Summary refreshed. To run checks start the worker process."); }} className="rounded px-3 py-1 text-xs border">Refresh</button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Notifier worker</div>
                    <div className="text-sm font-medium">Deliver webhooks & emails</div>
                  </div>
                  <button onClick={() => alert("Dev command:\n\nNODE_ENV=production node -r dotenv/config ./dist/lib/monitor/notifierWorker.js")} className="rounded px-3 py-1 text-xs border">Show command</button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Manage rules</div>
                    <div className="text-sm font-medium">Create automation for events</div>
                  </div>
                  <a href="/dashboard/monitor/rules" className="rounded px-3 py-1 text-xs border">Open</a>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">View notifications</div>
                    <div className="text-sm font-medium">App notifications & history</div>
                  </div>
                  <a href="/dashboard/monitor/notifications" className="rounded px-3 py-1 text-xs border">Open</a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-xs">
              <div className="font-semibold">Monitor Metrics</div>
              <div className="mt-2 text-xs text-slate-600">
                Operational metrics and high-level signals — no repository paths or environment values are shown here.
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{watchesCount}</div>
                  <div className="text-slate-500">Watches</div>
                </div>
                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{avgFrequencyDays}</div>
                  <div className="text-slate-500">Avg frequency (days)</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{failingWatchesCount}</div>
                  <div className="text-slate-500">Failing watches</div>
                </div>
                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{eventsPerDayEstimate}</div>
                  <div className="text-slate-500">Events/day (est.)</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{notificationsLast7Days}</div>
                  <div className="text-slate-500">Notifications (7d)</div>
                </div>
                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{processedEventRatePercent === "—" ? "—" : `${processedEventRatePercent}%`}</div>
                  <div className="text-slate-500">Processed rate</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{autoWatchPercent === "—" ? "—" : `${autoWatchPercent}%`}</div>
                  <div className="text-slate-500">Auto watches</div>
                </div>
                <div className="p-2 bg-white rounded shadow-sm text-center">
                  <div className="text-2xl font-semibold">{productLinkedPercent === "—" ? "—" : `${productLinkedPercent}%`}</div>
                  <div className="text-slate-500">Linked to product</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm text-center col-span-2">
                  <div className="text-2xl font-semibold">{avgRetryCount}</div>
                  <div className="text-slate-500">Avg retry count</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs">
              <div className="font-semibold">Operational tips</div>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>Start small: monitor a seed of important SKUs first.</li>
                <li>Set frequency per vendor to avoid rate-limits and CAPTCHAs.</li>
                <li>Use rules to limit noise — e.g., alert only on price changes &gt; X%.</li>
                <li>Use a headless-renderer fallback for JS-heavy pages (separate Playwright worker).</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
