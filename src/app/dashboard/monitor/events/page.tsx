"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * All Events - audit & tracking console (upgraded UI + no horizontal overflow)
 *
 * Uses:
 * - GET /api/monitor/events
 *
 * Path: src/app/dashboard/monitor/events/page.tsx
 */

type SortKey = "created_at" | "event_type" | "severity";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
        "max-w-full",
        tones
      )}
    >
      {children}
    </span>
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
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950 whitespace-nowrap";
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

function MetricCard({
  label,
  value,
  sub,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "blue" | "purple" | "teal" | "amber";
}) {
  const toneMap: Record<
    string,
    { top: string; glowA: string; glowB: string; border: string; wash: string }
  > = {
    blue: {
      border: "border-sky-200/70 dark:border-sky-500/20",
      wash: "from-sky-500/10 via-sky-500/0 to-transparent dark:from-sky-400/10 dark:via-sky-400/0",
      glowA: "bg-sky-400/16 dark:bg-sky-500/12",
      glowB: "bg-indigo-400/10 dark:bg-indigo-500/10",
      top: "from-sky-400/55 via-sky-300/20 to-transparent dark:from-sky-300/35 dark:via-sky-300/15",
    },
    purple: {
      border: "border-violet-200/70 dark:border-violet-500/20",
      wash: "from-violet-500/10 via-violet-500/0 to-transparent dark:from-violet-400/10 dark:via-violet-400/0",
      glowA: "bg-violet-400/16 dark:bg-violet-500/12",
      glowB: "bg-fuchsia-400/10 dark:bg-fuchsia-500/10",
      top: "from-violet-400/55 via-violet-300/20 to-transparent dark:from-violet-300/35 dark:via-violet-300/15",
    },
    teal: {
      border: "border-emerald-200/70 dark:border-emerald-500/20",
      wash: "from-emerald-500/10 via-emerald-500/0 to-transparent dark:from-emerald-400/10 dark:via-emerald-400/0",
      glowA: "bg-emerald-400/14 dark:bg-emerald-500/12",
      glowB: "bg-cyan-400/10 dark:bg-cyan-500/10",
      top: "from-emerald-400/55 via-emerald-300/20 to-transparent dark:from-emerald-300/35 dark:via-emerald-300/15",
    },
    amber: {
      border: "border-amber-200/70 dark:border-amber-500/20",
      wash: "from-amber-500/12 via-amber-500/0 to-transparent dark:from-amber-400/10 dark:via-amber-400/0",
      glowA: "bg-amber-400/16 dark:bg-amber-500/12",
      glowB: "bg-orange-400/10 dark:bg-orange-500/10",
      top: "from-amber-400/60 via-amber-300/20 to-transparent dark:from-amber-300/35 dark:via-amber-300/15",
    },
  };

  const t = toneMap[tone];

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl border bg-white/88 p-4",
        "shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] backdrop-blur-xl",
        "dark:bg-slate-950/45",
        "max-w-full",
        t.border
      )}
    >
      <div className={cx("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r", t.top)} />
      <div className={cx("pointer-events-none absolute inset-0 bg-gradient-to-br", t.wash)} />
      <div className={cx("pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl", t.glowA)} />
      <div className={cx("pointer-events-none absolute -left-10 -bottom-12 h-28 w-28 rounded-full blur-2xl", t.glowB)} />

      <div className="relative min-w-0">
        <div className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
          {label}
        </div>
        <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </div>
        {sub ? (
          <div className="mt-2 text-[11px] leading-none text-slate-500 dark:text-slate-400">
            <span className="block truncate whitespace-nowrap">{sub}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SeverityBadge({ sev }: { sev?: string | null }) {
  const s = String(sev ?? "info").toLowerCase();
  const cls =
    s === "critical"
      ? "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100"
      : s === "warning"
      ? "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", cls)}>
      {s}
    </span>
  );
}

function TypePill({ t }: { t?: string | null }) {
  const s = String(t ?? "event").toLowerCase();
  const cls =
    s === "change_detected"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100"
      : s === "scrape_failed" || s === "error"
      ? "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100"
      : s === "no_change"
      ? "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", cls)}>
      {s}
    </span>
  );
}

function fmtCompactDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

function safeStringify(obj: any) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AllEventsPage() {
  const [events, setEvents] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("any");
  const [severityFilter, setSeverityFilter] = useState<string>("any");
  const [processedFilter, setProcessedFilter] = useState<string>("any");

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/events");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setEvents(j.events ?? []);
      else setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const allTypes = useMemo(() => {
    const list = events ?? [];
    const set = new Set<string>();
    for (const e of list) if (e?.event_type) set.add(String(e.event_type));
    return Array.from(set).sort();
  }, [events]);

  const allSeverities = useMemo(() => {
    const list = events ?? [];
    const set = new Set<string>();
    for (const e of list) if (e?.severity) set.add(String(e.severity));
    const arr = Array.from(set);
    const order = ["info", "warning", "critical"];
    arr.sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));
    return arr;
  }, [events]);

  const filteredAndSorted = useMemo(() => {
    const list = events ?? [];
    const q = String(query || "").trim().toLowerCase();

    let out = list.filter((ev) => {
      if (eventTypeFilter !== "any" && (ev.event_type ?? "") !== eventTypeFilter) return false;
      if (severityFilter !== "any" && (ev.severity ?? "") !== severityFilter) return false;

      if (processedFilter !== "any") {
        const proc = !!ev.processed;
        if (processedFilter === "yes" && !proc) return false;
        if (processedFilter === "no" && proc) return false;
      }

      if (q) {
        const title = ev.payload?.snapshot?.title ?? "";
        const url = ev.payload?.snapshot?.url ?? "";
        const watch = ev.watch_id ?? "";
        const hay = `${title} ${url} ${watch} ${ev.payload ? safeStringify(ev.payload) : ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    out.sort((a: any, b: any) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];

      if (sortKey === "created_at") {
        av = a.created_at ? new Date(a.created_at).getTime() : 0;
        bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        av = String(av ?? "");
        bv = String(bv ?? "");
      }

      if (av === bv) return 0;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });

    return out;
  }, [events, query, eventTypeFilter, severityFilter, processedFilter, sortKey, sortDir]);

  const total = filteredAndSorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, eventTypeFilter, severityFilter, processedFilter, sortKey, sortDir]);

  const metrics = useMemo(() => {
    const list = events ?? [];
    if (!list.length) {
      return {
        eventsPerDay: "—",
        uniqueWatches: 0,
        processedPct: "—" as const,
        topTypes: [] as [string, number][],
      };
    }
    const now = Date.now();
    const last7 = list.filter((ev) => now - new Date(ev.created_at).getTime() < 7 * 24 * 60 * 60 * 1000);
    const eventsPerDay = Math.round((last7.length / 7) * 10) / 10;

    const uniqueWatches = new Set(list.map((e) => e.watch_id).filter(Boolean)).size;

    const processed = list.filter((e) => e.processed).length;
    const processedPct = Math.round((processed / list.length) * 100);

    const typeCounts: Record<string, number> = {};
    list.forEach((e) => {
      const k = String(e.event_type ?? "event");
      typeCounts[k] = (typeCounts[k] ?? 0) + 1;
    });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { eventsPerDay, uniqueWatches, processedPct, topTypes };
  }, [events]);

  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/14" />
        <div className="absolute top-24 right-12 h-56 w-56 rounded-full bg-emerald-300/12 blur-3xl dark:bg-emerald-500/10" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6 overflow-x-hidden">
        {/* Header */}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur dark:border-amber-400/35 dark:bg-slate-950/55 dark:text-amber-100 max-w-full">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400/60 bg-slate-100 dark:border-amber-400/35 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-300" />
                </span>
                Commerce • AvidiaMonitor
              </span>

              <TinyChip tone="signal">Events console</TinyChip>
              <TinyChip tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Filters • Search • Audit
              </TinyChip>
            </div>

            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                All{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-300 dark:to-sky-300">
                  Monitor events
                </span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Audit, filter, and inspect events produced by the Monitor worker & scraper.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <SoftButton href="/dashboard/monitor" variant="primary">
              Open Monitor
            </SoftButton>
            <SoftButton href="/dashboard" variant="secondary">
              Back
            </SoftButton>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard tone="purple" label="Events/day (7d)" value={metrics.eventsPerDay} sub="Rolling 7-day average" />
          <MetricCard tone="teal" label="Unique watches" value={metrics.uniqueWatches} sub="Distinct watch_id in dataset" />
          <MetricCard
            tone="blue"
            label="Processed rate"
            value={metrics.processedPct === "—" ? "—" : `${metrics.processedPct}%`}
            sub="Events marked processed=true"
          />
          <MetricCard
            tone="amber"
            label="Top event types"
            value={
              metrics.topTypes.length === 0 ? (
                <span className="text-slate-400 dark:text-slate-500">—</span>
              ) : (
                <span className="text-base font-semibold">{metrics.topTypes[0]?.[0] ?? "—"}</span>
              )
            }
            sub={
              metrics.topTypes.length === 0
                ? "—"
                : metrics.topTypes
                    .slice(0, 2)
                    .map(([t, c]) => `${t} · ${c}`)
                    .join("  •  ")
            }
          />
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-x-hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
              <div className="min-w-0 w-full sm:w-[420px] max-w-full">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Search</div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title / URL / watch_id / payload…"
                  className={cx(
                    "mt-1 w-full max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm",
                    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                    "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-sky-500/40"
                  )}
                />
              </div>

              <div className="flex flex-wrap items-end gap-2 min-w-0 max-w-full">
                <div className="w-full sm:w-auto">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Type</div>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className={cx(
                      "mt-1 w-full sm:w-auto max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="any">Any</option>
                    {(allTypes.length ? allTypes : ["change_detected", "no_change", "scrape_failed", "error"]).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-auto">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Severity</div>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className={cx(
                      "mt-1 w-full sm:w-auto max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="any">Any</option>
                    {(allSeverities.length ? allSeverities : ["info", "warning", "critical"]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-auto">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Processed</div>
                  <select
                    value={processedFilter}
                    onChange={(e) => setProcessedFilter(e.target.value)}
                    className={cx(
                      "mt-1 w-full sm:w-auto max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="any">Any</option>
                    <option value="yes">Processed</option>
                    <option value="no">Unprocessed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-auto">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Sort</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={cx(
                      "w-full sm:w-auto rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="created_at">Created</option>
                    <option value="event_type">Event type</option>
                    <option value="severity">Severity</option>
                  </select>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as SortDir)}
                    className={cx(
                      "w-full sm:w-auto rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="desc">desc</option>
                    <option value="asc">asc</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  setPage(1);
                  load();
                }}
                className={cx(
                  "h-[42px] w-full sm:w-auto rounded-full px-4 text-sm font-semibold whitespace-nowrap",
                  "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                  "hover:bg-white hover:text-slate-900",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70"
                )}
              >
                Reload
              </button>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-x-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Events</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {total === 0 ? 0 : Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)}
              </span>{" "}
              of <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span>{" "}
              (page{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {page}/{pages}
              </span>
              )
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {loading && events === null ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No events</div>
            ) : (
              pageItems.map((ev) => {
                const id = String(ev.id ?? `${ev.watch_id ?? "w"}-${ev.created_at ?? Math.random()}`);
                const title = ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url ?? ev.event_type ?? "Event";
                const url = ev.payload?.snapshot?.url ?? "";
                const watchId = ev.watch_id ? String(ev.watch_id) : "";
                const isExpanded = !!expanded[id];

                return (
                  <div
                    key={id}
                    className={cx(
                      "rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm",
                      "dark:border-slate-800/60 dark:bg-slate-950/35"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <TypePill t={ev.event_type} />
                          <SeverityBadge sev={ev.severity} />
                          {ev.processed ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100 whitespace-nowrap">
                              processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/75 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300 whitespace-nowrap">
                              unprocessed
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmtCompactDate(ev.created_at)}
                          </span>
                        </div>

                        <div className="mt-2 min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {title}
                          </div>

                          {/* These lines are the most common cause of horizontal overflow */}
                          <div className="mt-1 min-w-0 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {watchId ? (
                              <div className="min-w-0 truncate">
                                <span className="text-slate-400 dark:text-slate-500">watch:</span>{" "}
                                <span className="truncate">{watchId}</span>
                              </div>
                            ) : null}
                            {url ? (
                              <div className="min-w-0 truncate">
                                <span className="text-slate-400 dark:text-slate-500">url:</span>{" "}
                                <span className="truncate">{url}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Actions: wrap instead of overflowing */}
                      <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
                        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(safeStringify(ev.payload ?? ev));
                              alert("Copied payload");
                            }}
                            className={cx(
                              "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                              "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                              "hover:bg-white hover:text-slate-900",
                              "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                            )}
                          >
                            Copy
                          </button>

                          <button
                            onClick={() => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
                            className={cx(
                              "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                              "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                              "hover:bg-white hover:text-slate-900",
                              "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                            )}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                        </div>

                        <a
                          href={watchId ? `/dashboard/monitor/watches?filter=${encodeURIComponent(watchId)}` : "/dashboard/monitor"}
                          className={cx(
                            "inline-flex w-full sm:w-auto items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                            "bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 text-slate-950",
                            "hover:from-sky-300 hover:via-sky-500 hover:to-indigo-400",
                            "shadow-[0_12px_26px_-18px_rgba(2,6,23,0.55)]"
                          )}
                        >
                          Open watch
                        </a>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-3">
                        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200 max-w-full overflow-hidden">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              Payload JSON
                            </div>
                            {url ? (
                              <button
                                onClick={() => {
                                  navigator.clipboard?.writeText(String(url));
                                  alert("Copied URL");
                                }}
                                className={cx(
                                  "rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap",
                                  "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                                  "hover:bg-white hover:text-slate-900",
                                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                                )}
                              >
                                Copy URL
                              </button>
                            ) : null}
                          </div>

                          {/* IMPORTANT: avoid horizontal overflow */}
                          <pre className="max-h-56 max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words">
                            {safeStringify(ev.payload ?? {})}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Page{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span>{" "}
              of{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{pages}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                  "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                  "hover:bg-white hover:text-slate-900 disabled:opacity-50",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                )}
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                  "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                  "hover:bg-white hover:text-slate-900 disabled:opacity-50",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                )}
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                  "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                  "hover:bg-white hover:text-slate-900 disabled:opacity-50",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                )}
              >
                Next
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page === pages}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                  "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                  "hover:bg-white hover:text-slate-900 disabled:opacity-50",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                )}
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
