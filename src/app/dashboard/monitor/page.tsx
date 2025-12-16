"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";

/**
 * Monitor dashboard page (metrics update + scroll behavior)
 *
 * - Recent monitor events card now has a bounded vertical scroll area
 *   (prevents the page from growing indefinitely).
 * - No other layout changes.
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type StatTone = "blue" | "purple" | "teal" | "amber";

function StatCard({
  title,
  value,
  caption,
  tone = "blue",
}: {
  title: string;
  value: React.ReactNode;
  caption?: string;
  tone?: StatTone;
}) {
  // GSC-like performance tile tones
  const toneMap: Record<
    StatTone,
    {
      border: string;
      wash: string;
      glowA: string;
      glowB: string;
      top: string;
      chip: string;
    }
  > = {
    blue: {
      border: "border-sky-200/70 dark:border-sky-500/20",
      wash: "from-sky-500/10 via-sky-500/0 to-transparent dark:from-sky-400/10 dark:via-sky-400/0",
      glowA: "bg-sky-400/16 dark:bg-sky-500/12",
      glowB: "bg-indigo-400/10 dark:bg-indigo-500/10",
      top: "from-sky-400/55 via-sky-300/20 to-transparent dark:from-sky-300/35 dark:via-sky-300/15",
      chip:
        "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200",
    },
    purple: {
      border: "border-violet-200/70 dark:border-violet-500/20",
      wash: "from-violet-500/10 via-violet-500/0 to-transparent dark:from-violet-400/10 dark:via-violet-400/0",
      glowA: "bg-violet-400/16 dark:bg-violet-500/12",
      glowB: "bg-fuchsia-400/10 dark:bg-fuchsia-500/10",
      top: "from-violet-400/55 via-violet-300/20 to-transparent dark:from-violet-300/35 dark:via-violet-300/15",
      chip:
        "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200",
    },
    teal: {
      border: "border-emerald-200/70 dark:border-emerald-500/20",
      wash: "from-emerald-500/10 via-emerald-500/0 to-transparent dark:from-emerald-400/10 dark:via-emerald-400/0",
      glowA: "bg-emerald-400/14 dark:bg-emerald-500/12",
      glowB: "bg-cyan-400/10 dark:bg-cyan-500/10",
      top: "from-emerald-400/55 via-emerald-300/20 to-transparent dark:from-emerald-300/35 dark:via-emerald-300/15",
      chip:
        "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    amber: {
      border: "border-amber-200/70 dark:border-amber-500/20",
      wash: "from-amber-500/12 via-amber-500/0 to-transparent dark:from-amber-400/10 dark:via-amber-400/0",
      glowA: "bg-amber-400/16 dark:bg-amber-500/12",
      glowB: "bg-orange-400/10 dark:bg-orange-500/10",
      top: "from-amber-400/60 via-amber-300/20 to-transparent dark:from-amber-300/35 dark:via-amber-300/15",
      chip:
        "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200",
    },
  };

  const t = toneMap[tone];

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl border bg-white/88 p-4",
        "shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] backdrop-blur-xl",
        "dark:bg-slate-950/45",
        t.border
      )}
    >
      {/* subtle top accent (per-card) */}
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          t.top
        )}
      />

      {/* GSC-style soft wash + glows */}
      <div className={cx("pointer-events-none absolute inset-0 bg-gradient-to-br", t.wash)} />
      <div className={cx("pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl", t.glowA)} />
      <div className={cx("pointer-events-none absolute -left-10 -bottom-12 h-28 w-28 rounded-full blur-2xl", t.glowB)} />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          {/* Title Case (no uppercase) */}
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </div>

          <span
            className={cx(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-sm",
              t.chip
            )}
          >
            Live
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-3xl font-semibold leading-none text-slate-900 dark:text-slate-50">
            {value}
          </div>
        </div>

        {caption ? (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SoftButton({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950";
  if (variant === "primary") {
    return (
      <a
        href={href}
        className={cx(
          base,
          "text-slate-950 shadow-[0_16px_34px_-22px_rgba(2,6,23,0.55)]",
          "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500",
          "hover:from-amber-300 hover:via-amber-500 hover:to-orange-400",
          "focus-visible:ring-amber-400/70",
          className
        )}
      >
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      className={cx(
        base,
        "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
        "hover:bg-white hover:text-slate-900",
        "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50",
        "focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70",
        className
      )}
    >
      {children}
    </a>
  );
}

function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal";
}) {
  const tones =
    tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] shadow-sm backdrop-blur",
        tones
      )}
    >
      {children}
    </span>
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
    return watches.filter(
      (w) =>
        (w.last_status && String(w.last_status) !== "ok") ||
        Number(w.retry_count ?? 0) > 0
    ).length;
  }, [watches]);

  const eventsPerDayEstimate = useMemo(() => {
    if (!events) return "—";
    const last7 = events.filter((ev) => {
      const t = new Date(ev.created_at).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return Math.round((last7 / 7) * 10) / 10;
  }, [events]);

  // Non-duplicative metrics:
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
    const total = watches.reduce(
      (acc, w) => acc + Number(w.retry_count ?? 0),
      0
    );
    return Math.round((total / watches.length) * 10) / 10;
  }, [watches]);

  const unreadNotificationsCount = notifications
    ? notifications.filter((n) => !n.read).length
    : "—";
  const rulesCount = rules?.length ?? "—";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* BACKGROUND: layered blobs + radial wash + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/14" />
        <div className="absolute top-24 right-12 h-56 w-56 rounded-full bg-emerald-300/12 blur-3xl dark:bg-emerald-500/10" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            {/* Identity row (aligned with other modules) */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur dark:border-amber-400/35 dark:bg-slate-950/55 dark:text-amber-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400/60 bg-slate-100 dark:border-amber-400/35 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-300" />
                </span>
                Commerce • AvidiaMonitor
              </span>

              <TinyChip tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Workers • Rules • Notifier
              </TinyChip>

              <TinyChip tone="signal">
                ✨ Change detection → alerts → automation
              </TinyChip>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                Monitor{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-300 dark:to-sky-300">
                  changes, notifications &amp; automation
                </span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Watch product sources, detect deltas, and trigger pipelines or
                alerts. Manage watches, rules, and notifications here.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <SoftButton href="#add-watch" variant="primary">
              Add watch
            </SoftButton>
            <SoftButton href="/dashboard/monitor/rules" variant="secondary">
              Rules ({rulesCount})
            </SoftButton>
            <SoftButton
              href="/dashboard/monitor/notifications"
              variant="secondary"
            >
              Notifications ({unreadNotificationsCount})
            </SoftButton>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-4 lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Watches"
                tone="blue"
                value={loadingSummary ? "…" : watchesCount}
                caption="Configured watches"
              />
              <StatCard
                title="Events (24h)"
                tone="purple"
                value={loadingSummary ? "…" : eventsCount24h}
                caption="Events in last 24 hours"
              />
              <StatCard
                title="Avg frequency (days)"
                tone="teal"
                value={loadingSummary ? "…" : avgFrequencyDays}
                caption="Average check frequency"
              />
              <StatCard
                title="Failing watches"
                tone="amber"
                value={loadingSummary ? "…" : failingWatchesCount}
                caption="Watches with errors/retries"
              />
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <MonitorDashboard />
            </div>

            {/* Recent events: bounded scroll area to avoid infinite page growth */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Recent monitor events
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Quick view of recent events. Use Rules to automate alerts and
                    Notifier to deliver webhooks / emails.
                  </p>
                </div>
                <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  Most recent
                </div>
              </div>

              <div className="mt-3">
                <div
                  className="space-y-2 pr-2"
                  style={{ maxHeight: "36vh", overflowY: "auto" }}
                >
                  {events === null ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Loading…
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      No events yet — add a watch or upload/import a product to
                      get started.
                    </div>
                  ) : (
                    events.slice(0, 50).map((ev) => (
                      <div
                        key={ev.id}
                        className={cx(
                          "rounded-xl border border-slate-200/70 bg-slate-50/70 p-3",
                          "shadow-sm",
                          "flex items-start justify-between gap-3",
                          "dark:border-slate-800/60 dark:bg-slate-900/30"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {ev.event_type} · {ev.severity}
                          </div>
                          <div className="mt-0.5 truncate font-medium text-slate-900 dark:text-slate-50">
                            {ev.payload?.snapshot?.title ??
                              ev.payload?.snapshot?.url ??
                              "Event"}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                            {ev.payload?.snapshot?.url}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(ev.created_at).toLocaleString()}
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(
                                  JSON.stringify(ev.payload ?? ev, null, 2)
                                );
                                alert("Event payload copied");
                              }}
                              className={cx(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                                "hover:bg-white hover:text-slate-900",
                                "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                              )}
                            >
                              Copy
                            </button>
                            <a
                              href="/dashboard/monitor/notifications"
                              className={cx(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                                "hover:bg-white hover:text-slate-900",
                                "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                              )}
                            >
                              Notifications
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {events && events.length > 50 ? (
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Showing latest 50 events.{" "}
                    <a
                      className="underline underline-offset-2"
                      href="/dashboard/monitor/events"
                    >
                      View all events
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Quick actions
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Admin utilities for Monitor
                  </p>
                </div>

                <TinyChip>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Ops
                </TinyChip>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Run all due checks
                    </div>
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      Worker (manual)
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      loadSummary();
                      alert(
                        "Summary refreshed. To run checks start the worker process."
                      );
                    }}
                    className={cx(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                      "hover:bg-white hover:text-slate-900",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                    )}
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Notifier worker
                    </div>
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      Deliver webhooks &amp; emails
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      alert(
                        "Dev command:\n\nNODE_ENV=production node -r dotenv/config ./dist/lib/monitor/notifierWorker.js"
                      )
                    }
                    className={cx(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                      "hover:bg-white hover:text-slate-900",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                    )}
                  >
                    Show command
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Manage rules
                    </div>
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      Create automation for events
                    </div>
                  </div>
                  <a
                    href="/dashboard/monitor/rules"
                    className={cx(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                      "hover:bg-white hover:text-slate-900",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                    )}
                  >
                    Open
                  </a>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      View notifications
                    </div>
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      App notifications &amp; history
                    </div>
                  </div>
                  <a
                    href="/dashboard/monitor/notifications"
                    className={cx(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                      "hover:bg-white hover:text-slate-900",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                    )}
                  >
                    Open
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-xs shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/35">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  Monitor Metrics
                </div>
                <TinyChip>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Summary
                </TinyChip>
              </div>

              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Operational metrics and high-level signals — no repository paths
                or environment values are shown here.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {[
                  { v: watchesCount, l: "Watches" },
                  { v: avgFrequencyDays, l: "Avg frequency (days)" },
                  { v: failingWatchesCount, l: "Failing watches" },
                  { v: eventsPerDayEstimate, l: "Events/day (est.)" },
                  { v: notificationsLast7Days, l: "Notifications (7d)" },
                  {
                    v:
                      processedEventRatePercent === "—"
                        ? "—"
                        : `${processedEventRatePercent}%`,
                    l: "Processed rate",
                  },
                  {
                    v: autoWatchPercent === "—" ? "—" : `${autoWatchPercent}%`,
                    l: "Auto watches",
                  },
                  {
                    v:
                      productLinkedPercent === "—"
                        ? "—"
                        : `${productLinkedPercent}%`,
                    l: "Linked to product",
                  },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="rounded-xl border border-slate-200/70 bg-white/75 p-3 text-center shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35"
                  >
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {m.v as any}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {m.l}
                    </div>
                  </div>
                ))}

                <div className="col-span-2 rounded-xl border border-slate-200/70 bg-white/75 p-3 text-center shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                  <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {avgRetryCount}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Avg retry count
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-xs shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="font-semibold text-slate-900 dark:text-slate-50">
                Operational tips
              </div>
              <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>Start small: monitor a seed of important SKUs first.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>Set frequency per vendor to avoid rate-limits and CAPTCHAs.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span>
                    Use rules to limit noise — e.g., alert only on price changes &gt; X%.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>
                    Use a headless-renderer fallback for JS-heavy pages (separate Playwright worker).
                  </span>
                </li>
              </ul>

              {/* keep lastCheckSample state “alive” without exposing sensitive details */}
              {lastCheckSample ? (
                <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    Latest signal (sample)
                  </div>
                  <div className="mt-1 truncate">
                    {lastCheckSample?.payload?.snapshot?.url ??
                      lastCheckSample?.payload?.snapshot?.title ??
                      "—"}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
