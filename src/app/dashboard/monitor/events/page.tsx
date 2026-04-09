"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * All Events - viewport-safe, responsive, colorful top cards
 * Path: src/app/dashboard/monitor/events/page.tsx
 */

type SortKey = "created_at" | "event_type" | "severity";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeStringify(obj: any) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
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

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

function TypePill({ t }: { t?: string | null }) {
  const s = String(t ?? "event");
  const tone =
    s === "change_detected"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100"
      : s === "no_change"
      ? "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-100"
      : s === "scrape_failed" || s === "error"
      ? "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return <Pill className={tone}>{s}</Pill>;
}

function SeverityPill({ sev }: { sev?: string | null }) {
  const s = String(sev ?? "info").toLowerCase();
  const tone =
    s === "critical"
      ? "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100"
      : s === "warning"
      ? "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return <Pill className={tone}>{s}</Pill>;
}

/** Colorful metric cards (like earlier dashboard) + Title Case labels */
function MetricCard({
  label,
  value,
  sub,
  tone = "sky",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "sky" | "violet" | "emerald" | "amber";
}) {
  const toneTop: Record<string, string> = {
    sky: "from-sky-400/55 via-sky-300/30 to-transparent dark:from-sky-300/35 dark:via-sky-400/15",
    violet:
      "from-violet-400/55 via-violet-300/30 to-transparent dark:from-violet-300/35 dark:via-violet-400/15",
    emerald:
      "from-emerald-400/55 via-emerald-300/30 to-transparent dark:from-emerald-300/35 dark:via-emerald-400/15",
    amber:
      "from-amber-400/60 via-amber-300/30 to-transparent dark:from-amber-300/40 dark:via-amber-400/15",
  };

  const orb: Record<string, string> = {
    sky: "bg-sky-300/18 dark:bg-sky-500/10",
    violet: "bg-violet-300/18 dark:bg-violet-500/10",
    emerald: "bg-emerald-300/16 dark:bg-emerald-500/10",
    amber: "bg-amber-300/18 dark:bg-amber-500/10",
  };

  return (
    <div
      className={cx(
        "group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-4",
        "shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] backdrop-blur-xl",
        "dark:border-slate-800/60 dark:bg-slate-950/45"
      )}
    >
      {/* top gradient line */}
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          toneTop[tone]
        )}
      />
      {/* soft orbs */}
      <div
        className={cx(
          "pointer-events-none absolute -right-12 -top-14 h-28 w-28 rounded-full blur-2xl",
          orb[tone]
        )}
      />
      <div
        className={cx(
          "pointer-events-none absolute -left-10 -bottom-14 h-28 w-28 rounded-full blur-2xl",
          orb[tone]
        )}
      />

      <div className="relative min-w-0">
        <div className="truncate text-[11px] font-medium tracking-[0.02em] text-slate-600 dark:text-slate-300">
          {label}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3 min-w-0">
          <div className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
            {value}
          </div>
        </div>
        {sub ? (
          <div className="mt-2">
            <span className="block truncate whitespace-nowrap text-[11px] leading-none text-slate-500 dark:text-slate-400">
              {sub}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
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
    arr.sort(
      (a, b) =>
        (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
        (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
    );
    return arr;
  }, [events]);

  const filteredAndSorted = useMemo(() => {
    const list = events ?? [];
    const q = String(query || "").trim().toLowerCase();

    let out = list.filter((ev) => {
      if (eventTypeFilter !== "any" && (ev.event_type ?? "") !== eventTypeFilter)
        return false;
      if (severityFilter !== "any" && (ev.severity ?? "") !== severityFilter)
        return false;

      if (processedFilter !== "any") {
        const proc = !!ev.processed;
        if (processedFilter === "yes" && !proc) return false;
        if (processedFilter === "no" && proc) return false;
      }

      if (q) {
        const title = ev.payload?.snapshot?.title ?? "";
        const url = ev.payload?.snapshot?.url ?? "";
        const watch = ev.watch_id ?? "";
        const hay = `${title} ${url} ${watch} ${
          ev.payload ? safeStringify(ev.payload) : ""
        }`.toLowerCase();
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
        eventsPerDay: "—" as const,
        uniqueWatches: 0,
        processedPct: "—" as const,
        topTypes: [] as [string, number][],
      };
    }

    const now = Date.now();
    const last7 = list.filter(
      (ev) => now - new Date(ev.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    );
    const eventsPerDay = Math.round((last7.length / 7) * 10) / 10;

    const uniqueWatches = new Set(
      list.map((e) => e.watch_id).filter(Boolean)
    ).size;

    const processed = list.filter((e) => e.processed).length;
    const processedPct = Math.round((processed / list.length) * 100);

    const typeCounts: Record<string, number> = {};
    list.forEach((e) => {
      const k = String(e.event_type ?? "event");
      typeCounts[k] = (typeCounts[k] ?? 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { eventsPerDay, uniqueWatches, processedPct, topTypes };
  }, [events]);

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background (clipped so it cannot cause horizontal overflow) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/14" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl overflow-x-hidden px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
              All{" "}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-300 dark:to-sky-300">
                Monitor Events
              </span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Audit, filter, and inspect events produced by the Monitor worker & scraper.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/monitor"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-sm"
            >
              Open Monitor
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200"
            >
              Back
            </a>
          </div>
        </header>

        {/* Metrics (colorful + Title Case labels) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          <MetricCard
            tone="violet"
            label="Events per Day (7d)"
            value={metrics.eventsPerDay}
            sub="Rolling 7-day average"
          />
          <MetricCard
            tone="emerald"
            label="Unique Watches"
            value={metrics.uniqueWatches}
            sub="Distinct watch_id values"
          />
          <MetricCard
            tone="sky"
            label="Processed Rate"
            value={metrics.processedPct === "—" ? "—" : `${metrics.processedPct}%`}
            sub="processed=true share"
          />
          <MetricCard
            tone="amber"
            label="Top Event Types"
            value={metrics.topTypes.length ? metrics.topTypes[0][0] : "—"}
            sub={
              metrics.topTypes.length
                ? metrics.topTypes
                    .slice(0, 2)
                    .map(([t, c]) => `${t} · ${c}`)
                    .join("  •  ")
                : "—"
            }
          />
        </section>

        {/* Filters (grid-based so it never exceeds viewport) */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-x-hidden">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 min-w-0">
            <div className="lg:col-span-6 min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Search
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title / URL / watch_id / payload…"
                className={cx(
                  "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm shadow-sm",
                  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-sky-500/40"
                )}
              />
            </div>

            <div className="lg:col-span-2 min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Type
              </div>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className={cx(
                  "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                )}
              >
                <option value="any">Any</option>
                {(allTypes.length
                  ? allTypes
                  : ["change_detected", "no_change", "scrape_failed", "error"]
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Severity
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className={cx(
                  "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                )}
              >
                <option value="any">Any</option>
                {(allSeverities.length ? allSeverities : ["info", "warning", "critical"]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="lg:col-span-2 min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Processed
              </div>
              <select
                value={processedFilter}
                onChange={(e) => setProcessedFilter(e.target.value)}
                className={cx(
                  "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                )}
              >
                <option value="any">Any</option>
                <option value="yes">Processed</option>
                <option value="no">Unprocessed</option>
              </select>
            </div>

            <div className="lg:col-span-12 min-w-0">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sort By
                  </div>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={cx(
                      "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="created_at">Created</option>
                    <option value="event_type">Event Type</option>
                    <option value="severity">Severity</option>
                  </select>
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Direction
                  </div>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as SortDir)}
                    className={cx(
                      "mt-1 w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-sm shadow-sm",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:focus:ring-sky-500/40"
                    )}
                  >
                    <option value="desc">desc</option>
                    <option value="asc">asc</option>
                  </select>
                </div>

                <div className="sm:col-span-1 lg:col-span-2" />

                <button
                  onClick={() => {
                    setPage(1);
                    load();
                  }}
                  className={cx(
                    "h-[42px] w-full rounded-full px-4 text-sm font-semibold whitespace-nowrap",
                    "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm",
                    "hover:bg-white hover:text-slate-900",
                    "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                  )}
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-x-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Events
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {total === 0 ? 0 : Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {total}
              </span>{" "}
              (page{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {page}/{pages}
              </span>
              )
            </div>
          </div>

          <div className="mt-3 space-y-2 min-w-0">
            {events === null ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Loading…
              </div>
            ) : loading && events.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Loading…
              </div>
            ) : pageItems.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No events
              </div>
            ) : (
              pageItems.map((ev) => {
                const id = String(
                  ev.id ?? `${ev.watch_id ?? "w"}-${ev.created_at ?? Math.random()}`
                );
                const title =
                  ev.payload?.snapshot?.title ??
                  ev.payload?.snapshot?.url ??
                  ev.event_type ??
                  "Event";
                const url = ev.payload?.snapshot?.url ?? "";
                const watchId = ev.watch_id ? String(ev.watch_id) : "";
                const isExpanded = !!expanded[id];

                return (
                  <div
                    key={id}
                    className={cx(
                      "min-w-0 max-w-full rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm",
                      "dark:border-slate-800/60 dark:bg-slate-950/35"
                    )}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 min-w-0">
                      <div className="sm:col-span-9 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <TypePill t={ev.event_type} />
                          <SeverityPill sev={ev.severity} />
                          <Pill
                            className={
                              ev.processed
                                ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100"
                                : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300"
                            }
                          >
                            {ev.processed ? "processed" : "unprocessed"}
                          </Pill>

                          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmtCompactDate(ev.created_at)}
                          </span>
                        </div>

                        <div className="mt-2 min-w-0">
                          <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {title}
                          </div>

                          {/* Watch and URL each on one line with label + value on same line */}
                          <div className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                            {watchId ? (
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="shrink-0 text-slate-400 dark:text-slate-500">
                                  watch:
                                </span>
                                <span className="min-w-0 truncate">{watchId}</span>
                              </div>
                            ) : null}

                            {url ? (
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="shrink-0 text-slate-400 dark:text-slate-500">
                                  url:
                                </span>
                                <span className="min-w-0 truncate">{url}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-3 min-w-0">
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                safeStringify(ev.payload ?? ev)
                              );
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
                            onClick={() =>
                              setExpanded((s) => ({ ...s, [id]: !s[id] }))
                            }
                            className={cx(
                              "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                              "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                              "hover:bg-white hover:text-slate-900",
                              "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                            )}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>

                          <a
                            href={
                              watchId
                                ? `/dashboard/monitor/watches?filter=${encodeURIComponent(
                                    watchId
                                  )}`
                                : "/dashboard/monitor"
                            }
                            className={cx(
                              "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                              "bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 text-slate-950",
                              "hover:from-sky-300 hover:via-sky-500 hover:to-indigo-400 shadow-sm"
                            )}
                          >
                            Open watch
                          </a>
                        </div>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-3 min-w-0 max-w-full">
                        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-200 overflow-hidden">
                          <div className="mb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Payload JSON
                          </div>
                          <pre className="max-h-56 max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all">
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Page{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {pages}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm hover:bg-white disabled:opacity-50 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm hover:bg-white disabled:opacity-50 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm hover:bg-white disabled:opacity-50 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page === pages}
                className="rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm hover:bg-white disabled:opacity-50 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65"
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
