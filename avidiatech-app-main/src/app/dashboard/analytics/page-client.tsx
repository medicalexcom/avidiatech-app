"use client";

import React, { useEffect, useState, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Ingestion {
  id: string;
  status: string;
  export_type: string;
  source_url?: string;
  created_at: string;
}

interface PipelineRun {
  id: string;
  status: string;
  created_at: string;
  finished_at?: string;
}

interface BulkJob {
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  created_at: string;
}

interface Metrics {
  ingestions: {
    total: number;
    pending: number;
    success: number;
    failed: number;
    seo_runs: number;
    describe_runs: number;
  };
  pipeline: {
    total_runs: number;
    succeeded: number;
    failed: number;
    running: number;
    success_rate: number | null;
  };
  imports: {
    total: number;
    completed: number;
    failed: number;
    success_rate: number | null;
  };
  bulk: {
    total: number;
    completed: number;
  };
  monitor: {
    watches: number;
    events: number;
  };
  recent: {
    ingestions: Ingestion[];
    pipeline_runs: PipelineRun[];
    bulk_jobs: BulkJob[];
  };
  timestamp: string;
}

// ─── Inline SVG charts ────────────────────────────────────────────────────────

/** Donut chart – segments prop: array of {value, color} */
function DonutChart({
  segments,
  size = 88,
  strokeWidth = 14,
  label,
  sublabel,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, sg) => s + sg.value, 0);

  let offset = 0;
  const arcs = segments.map((sg) => {
    const fraction = total > 0 ? sg.value / total : 0;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const el = (
      <circle
        key={sg.color}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={sg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset * circumference}
        strokeLinecap="butt"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    );
    offset += fraction;
    return el;
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />
        {arcs}
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {label !== undefined && (
            <span className="text-[15px] font-bold leading-none text-slate-900 dark:text-slate-50">
              {label}
            </span>
          )}
          {sublabel !== undefined && (
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal bar – single progress bar */
function ProgressBar({
  value,
  total,
  color = "#6366f1",
  height = 6,
}: {
  value: number;
  total: number;
  color?: string;
  height?: number;
}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/** Sparkline (simple SVG polyline, values are an array of numbers) */
function Sparkline({
  values,
  color = "#6366f1",
  width = 120,
  height = 36,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent = "#6366f1",
  loading = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accent }} />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
          {value}
        </p>
      )}
      {sub && (
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-500">{sub}</p>
      )}
    </div>
  );
}

// ─── Status dot ──────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    success: "bg-emerald-400",
    succeeded: "bg-emerald-400",
    completed: "bg-emerald-400",
    failed: "bg-rose-400",
    error: "bg-rose-400",
    pending: "bg-amber-400",
    running: "bg-sky-400 animate-pulse",
    queued: "bg-slate-400",
  };
  const cls = colorMap[status?.toLowerCase?.()] ?? "bg-slate-400";
  return <span className={`inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      if (data?.ok && data.metrics) {
        setMetrics(data.metrics);
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError(data?.error ?? "Failed to load metrics");
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Derived data
  const ing = metrics?.ingestions;
  const pip = metrics?.pipeline;
  const imp = metrics?.imports;
  const blk = metrics?.bulk;
  const mon = metrics?.monitor;

  // Module usage bars
  const moduleRows = [
    { name: "AvidiaDescribe", value: ing?.describe_runs ?? 0, color: "#6366f1" },
    { name: "AvidiaSEO", value: ing?.seo_runs ?? 0, color: "#06b6d4" },
    { name: "AvidiaExtract", value: ing?.total ?? 0, color: "#10b981" },
    { name: "AvidiaImport", value: imp?.total ?? 0, color: "#f59e0b" },
    { name: "Bulk Jobs", value: blk?.total ?? 0, color: "#8b5cf6" },
    { name: "Monitor", value: mon?.watches ?? 0, color: "#ec4899" },
  ];
  const moduleMax = Math.max(...moduleRows.map((r) => r.value), 1);

  // Ingestion donut segments
  const ingSegments = [
    { value: ing?.success ?? 0, color: "#10b981" },
    { value: ing?.failed ?? 0, color: "#f43f5e" },
    { value: ing?.pending ?? 0, color: "#f59e0b" },
  ];

  // Pipeline donut
  const pipSegments = [
    { value: pip?.succeeded ?? 0, color: "#10b981" },
    { value: pip?.failed ?? 0, color: "#f43f5e" },
    { value: pip?.running ?? 0, color: "#38bdf8" },
  ];

  // Sparkline: simulate per-day activity from the last 10 ingestions
  const recentIngs = metrics?.recent?.ingestions ?? [];
  const sparkValues = recentIngs
    .slice()
    .reverse()
    .map((_, i) => i + 1);

  const fmt = (n: number | undefined | null) =>
    n == null ? "—" : n.toLocaleString();

  const pct = (n: number | null | undefined) =>
    n == null ? "—" : `${n}%`;

  return (
    <PageShell glow="sky">

        {/* ── HEADER ── */}
        <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              Workspace · Analytics
              <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-700 dark:text-slate-200">Pipeline metrics</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
              Analytics &amp; Reporting
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Live metrics across all AvidiaTech modules — ingestions, pipeline runs, imports, bulk jobs, and monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lastRefresh && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => { setLoading(true); fetchMetrics(); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error} — check Supabase env vars.
          </div>
        )}

        {/* ── TOP SUMMARY STRIP ── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total ingestions" value={fmt(ing?.total)} sub="All product ingestion jobs" accent="#10b981" loading={loading} />
          <StatCard label="Pipeline runs" value={fmt(pip?.total_runs)} sub={`${pct(pip?.success_rate)} success rate`} accent="#6366f1" loading={loading} />
          <StatCard label="Import jobs" value={fmt(imp?.total)} sub={`${pct(imp?.success_rate)} completed`} accent="#f59e0b" loading={loading} />
          <StatCard label="Monitor watches" value={fmt(mon?.watches)} sub={`${fmt(mon?.events)} events tracked`} accent="#ec4899" loading={loading} />
        </section>

        {/* ── MAIN GRID: charts + activity ── */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Ingestion status + pipeline donuts */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ingestion &amp; Pipeline health
              </h2>

              <div className="flex flex-wrap items-start gap-8">
                {/* Ingestion donut */}
                <div className="flex flex-col items-center gap-3">
                  {loading ? (
                    <Skeleton className="h-[88px] w-[88px] rounded-full" />
                  ) : (
                    <DonutChart
                      segments={ingSegments}
                      label={fmt(ing?.total)}
                      sublabel="ingests"
                    />
                  )}
                  <div className="space-y-1 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-600 dark:text-slate-300">Success</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(ing?.success)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="text-slate-600 dark:text-slate-300">Failed</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(ing?.failed)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-slate-600 dark:text-slate-300">Pending</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(ing?.pending)}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px w-px flex-shrink-0 self-stretch border-l border-slate-100 dark:border-slate-800" />

                {/* Pipeline donut */}
                <div className="flex flex-col items-center gap-3">
                  {loading ? (
                    <Skeleton className="h-[88px] w-[88px] rounded-full" />
                  ) : (
                    <DonutChart
                      segments={pipSegments}
                      label={pip?.success_rate != null ? `${pip.success_rate}%` : "—"}
                      sublabel="success"
                    />
                  )}
                  <div className="space-y-1 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-600 dark:text-slate-300">Succeeded</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(pip?.succeeded)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="text-slate-600 dark:text-slate-300">Failed</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(pip?.failed)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      <span className="text-slate-600 dark:text-slate-300">Running</span>
                      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmt(pip?.running)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 self-center">
                  {/* Sparkline */}
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      Recent ingestion activity
                    </p>
                    {loading ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <Sparkline values={sparkValues} color="#6366f1" width={160} height={36} />
                    )}
                    <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">Last {recentIngs.length} ingestions</p>
                  </div>

                  {/* SEO / Describe mini stats */}
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                      <p className="text-slate-500 dark:text-slate-400">SEO runs</p>
                      {loading ? <Skeleton className="mt-1 h-4 w-10" /> : (
                        <p className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-slate-50">{fmt(ing?.seo_runs)}</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                      <p className="text-slate-500 dark:text-slate-400">Describe runs</p>
                      {loading ? <Skeleton className="mt-1 h-4 w-10" /> : (
                        <p className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-slate-50">{fmt(ing?.describe_runs)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Module usage bars */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Module usage
              </h2>
              <div className="space-y-3">
                {moduleRows.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
                      {loading ? <Skeleton className="h-3 w-8" /> : (
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmt(row.value)}</span>
                      )}
                    </div>
                    {loading ? <Skeleton className="h-1.5 w-full" /> : (
                      <ProgressBar value={row.value} total={moduleMax} color={row.color} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bulk jobs summary */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Bulk &amp; Import summary
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Bulk total", value: fmt(blk?.total), color: "#8b5cf6" },
                  { label: "Bulk completed", value: fmt(blk?.completed), color: "#10b981" },
                  { label: "Import total", value: fmt(imp?.total), color: "#f59e0b" },
                  { label: "Import success rate", value: pct(imp?.success_rate), color: "#06b6d4" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">{item.label}</p>
                    {loading ? <Skeleton className="mt-1 h-5 w-12" /> : (
                      <p className="mt-0.5 text-base font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent bulk jobs */}
              {!loading && metrics?.recent?.bulk_jobs && metrics.recent.bulk_jobs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Recent bulk jobs</p>
                  {metrics.recent.bulk_jobs.map((job) => {
                    const progress = job.total_items > 0 ? Math.round((job.completed_items / job.total_items) * 100) : 0;
                    return (
                      <div key={job.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                        <StatusDot status={job.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{job.id.slice(0, 8)}…</span>
                            <span className="ml-2 text-slate-500">{job.completed_items}/{job.total_items}</span>
                          </div>
                          <ProgressBar value={job.completed_items} total={job.total_items} color="#8b5cf6" height={4} />
                        </div>
                        <span className="text-[12px] text-slate-400">{progress}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">

            {/* Recent ingestions */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent ingestions</h2>
                <span className="text-[12px] text-slate-400">Last 10</span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : recentIngs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No ingestions yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentIngs.map((ing) => {
                    const domain = (() => {
                      try { return new URL(ing.source_url ?? "").hostname.replace("www.", ""); }
                      catch { return ing.source_url ?? "—"; }
                    })();
                    const time = new Date(ing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <div
                        key={ing.id}
                        className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] dark:border-slate-800 dark:bg-slate-950/70"
                      >
                        <StatusDot status={ing.status} />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">{domain}</span>
                        {ing.export_type && (
                          <span className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[12px] capitalize text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            {ing.export_type}
                          </span>
                        )}
                        <span className="flex-shrink-0 text-slate-400">{time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent pipeline runs */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline runs</h2>
                <span className="text-[12px] text-slate-400">Last 10</span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
                </div>
              ) : (metrics?.recent?.pipeline_runs ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No pipeline runs yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {(metrics?.recent?.pipeline_runs ?? []).map((run) => {
                    const duration = run.finished_at
                      ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.created_at).getTime()) / 1000)}s`
                      : "—";
                    const time = new Date(run.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <div
                        key={run.id}
                        className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] dark:border-slate-800 dark:bg-slate-950/70"
                      >
                        <StatusDot status={run.status} />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">
                          {run.id.slice(0, 10)}…
                        </span>
                        <span className="flex-shrink-0 text-slate-400">{duration}</span>
                        <span className="flex-shrink-0 text-slate-400">{time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Key metrics snapshot */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Monitor summary</h2>
              <div className="space-y-2.5">
                {[
                  { label: "Active watches", value: fmt(mon?.watches), color: "#ec4899" },
                  { label: "Total events", value: fmt(mon?.events), color: "#6366f1" },
                  { label: "Pipeline running now", value: fmt(pip?.running), color: "#38bdf8" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      {item.label}
                    </div>
                    {loading ? <Skeleton className="h-4 w-8" /> : (
                      <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-50">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                Data auto-refreshes every 30 seconds. All counts reflect live Supabase state.
              </div>
            </div>
          </div>
        </section>
    </PageShell>
  );
}
