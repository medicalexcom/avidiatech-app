"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge, StatusBadge, type ModuleStatus } from "@/components/ui/badge";

// ─── Module data ──────────────────────────────────────────────────────────────

const primaryModules = [
  {
    name: "AvidiaExtract",
    href: "/dashboard/extract",
    badge: "Ingestion",
    description: "Turn any manufacturer URL into normalized JSON for the whole stack.",
    color: {
      gradient: "from-amber-500/10 via-orange-500/6 to-transparent",
      border:   "border-amber-400/40 dark:border-amber-500/30",
      dot:      "bg-amber-400",
      ring:     "ring-amber-400/20",
      label:    "text-amber-600 dark:text-amber-400",
      glow:     "shadow-[0_0_40px_rgba(251,191,36,0.18)] dark:shadow-[0_0_40px_rgba(251,191,36,0.25)]",
      shimmer:  "via-amber-400/60",
    },
    status: "live" as ModuleStatus,
    metricKey: "ingestions",
  },
  {
    name: "AvidiaDescribe",
    href: "/dashboard/describe",
    badge: "Copy engine",
    description: "Start from rough notes and output SEO-ready product descriptions and HTML.",
    color: {
      gradient: "from-violet-500/10 via-indigo-500/6 to-transparent",
      border:   "border-violet-400/40 dark:border-violet-500/30",
      dot:      "bg-violet-400",
      ring:     "ring-violet-400/20",
      label:    "text-violet-600 dark:text-violet-400",
      glow:     "shadow-[0_0_40px_rgba(139,92,246,0.16)] dark:shadow-[0_0_40px_rgba(139,92,246,0.22)]",
      shimmer:  "via-violet-400/60",
    },
    status: "live" as ModuleStatus,
    metricKey: "describe",
  },
  {
    name: "AvidiaSEO",
    href: "/dashboard/seo",
    badge: "URL → SEO",
    description: "Feed ingested URLs into a single-click cascade for compliant SEO pages.",
    color: {
      gradient: "from-emerald-500/10 via-teal-500/6 to-transparent",
      border:   "border-emerald-400/40 dark:border-emerald-500/30",
      dot:      "bg-emerald-400",
      ring:     "ring-emerald-400/20",
      label:    "text-emerald-600 dark:text-emerald-400",
      glow:     "shadow-[0_0_40px_rgba(16,185,129,0.16)] dark:shadow-[0_0_40px_rgba(16,185,129,0.22)]",
      shimmer:  "via-emerald-400/60",
    },
    status: "live" as ModuleStatus,
    metricKey: "seo",
  },
];

const secondaryModules: {
  group: string;
  items: { name: string; href: string; tag: string; status: ModuleStatus }[];
}[] = [
  {
    group: "AI Extraction & Content",
    items: [
      { name: "Translate", href: "/dashboard/translate", tag: "Multi-language",   status: "beta" },
      { name: "Cluster",   href: "/dashboard/cluster",   tag: "Similarity groups", status: "beta" },
      { name: "Studio",    href: "/dashboard/studio",    tag: "Experiments",       status: "beta" },
    ],
  },
  {
    group: "Data Intelligence",
    items: [
      { name: "Match",    href: "/dashboard/match",    tag: "Catalog mapping", status: "beta" },
      { name: "Variants", href: "/dashboard/variants", tag: "Variations",      status: "beta" },
      { name: "Specs",    href: "/dashboard/specs",    tag: "Attributes",      status: "beta" },
      { name: "Docs",     href: "/dashboard/docs",     tag: "Manuals & PDFs",  status: "beta" },
      { name: "Images",   href: "/dashboard/images",   tag: "Visual library",  status: "beta" },
    ],
  },
  {
    group: "Commerce & Automation",
    items: [
      { name: "Import",   href: "/dashboard/import",   tag: "Sync in",         status: "live" },
      { name: "Audit",    href: "/dashboard/audit",    tag: "QA & scoring",    status: "beta" },
      { name: "Price",    href: "/dashboard/price",    tag: "Pricing rules",   status: "beta" },
      { name: "Feeds",    href: "/dashboard/feeds",    tag: "Outbound feeds",  status: "beta" },
      { name: "Monitor",  href: "/dashboard/monitor",  tag: "Pipeline health", status: "live" },
    ],
  },
  {
    group: "Developer Tools",
    items: [
      { name: "Browser", href: "/dashboard/browser", tag: "Scraper tools", status: "beta" },
      { name: "API",     href: "/dashboard/api",     tag: "API access",    status: "live" },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Metrics = {
  ingestions: { total: number; pending: number; success: number; failed: number; seo_runs: number; describe_runs: number };
  pipeline:   { total_runs: number; succeeded: number; failed: number; running: number; success_rate: number | null };
  imports:    { total: number; completed: number; failed: number; success_rate: number | null };
  bulk:       { total: number; completed: number };
  monitor:    { watches: number; events: number };
  recent:     { ingestions: any[]; pipeline_runs: any[]; bulk_jobs: any[] };
  timestamp:  string;
};

// ─── PipelineGlance ───────────────────────────────────────────────────────────
function PipelineGlance({ metrics, loading }: { metrics: Metrics | null; loading: boolean }) {
  const rows = [
    {
      label: "Total ingestions",
      value: metrics?.ingestions.total.toLocaleString() ?? "—",
      sub: metrics ? `${metrics.ingestions.success} ok · ${metrics.ingestions.failed} failed` : undefined,
      dot: "bg-emerald-400",
    },
    {
      label: "Pipeline runs",
      value: metrics?.pipeline.total_runs.toLocaleString() ?? "—",
      sub: metrics?.pipeline.success_rate !== null && metrics?.pipeline.success_rate !== undefined
        ? `${metrics.pipeline.success_rate}% success`
        : metrics ? `${metrics.pipeline.succeeded} ok` : undefined,
      dot: metrics?.pipeline.running ?? 0 > 0 ? "bg-amber-400 animate-pulse-soft" : "bg-cyan-400",
    },
    {
      label: "SEO runs",
      value: metrics?.ingestions.seo_runs.toLocaleString() ?? "—",
      sub: "via AvidiaSEO",
      dot: "bg-emerald-400",
    },
    {
      label: "Describe runs",
      value: metrics?.ingestions.describe_runs.toLocaleString() ?? "—",
      sub: "via AvidiaDescribe",
      dot: "bg-violet-400",
    },
    {
      label: "Import jobs",
      value: metrics?.imports.total.toLocaleString() ?? "—",
      sub: metrics?.imports.success_rate !== null && metrics?.imports.success_rate !== undefined
        ? `${metrics.imports.success_rate}% done` : undefined,
      dot: "bg-sky-400",
    },
    {
      label: "Bulk jobs",
      value: metrics?.bulk.total.toLocaleString() ?? "—",
      sub: metrics ? `${metrics.bulk.completed} completed` : undefined,
      dot: "bg-violet-400",
    },
    {
      label: "Monitor watches",
      value: metrics?.monitor.watches.toLocaleString() ?? "—",
      sub: metrics ? `${metrics.monitor.events} events` : undefined,
      dot: "bg-rose-400",
    },
  ];

  return (
    <div className="mt-3 space-y-1.5">
      {rows.map((row, i) => (
        <MetricCard
          key={i}
          label={row.label}
          value={row.value}
          sub={row.sub}
          dot={row.dot}
          loading={loading}
        />
      ))}
    </div>
  );
}

// ─── RecentActivity ───────────────────────────────────────────────────────────
function RecentActivity({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const items = metrics.recent.ingestions.slice(0, 6);
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center dark:border-slate-800">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((row: any) => {
        const isOk   = row.status === "success" || row.status === "succeeded";
        const isFail = row.status === "failed";
        return (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] transition-colors hover:bg-white dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:bg-slate-900/90"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isOk ? "bg-emerald-400" : isFail ? "bg-rose-400" : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                {row.source_url
                  ? row.source_url.replace(/^https?:\/\//, "").slice(0, 40)
                  : row.id?.slice(0, 12)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.export_type && (
                <span className="text-[9.5px] uppercase tracking-wide text-slate-400">
                  {row.export_type}
                </span>
              )}
              <Badge
                variant={isOk ? "success" : isFail ? "danger" : "warning"}
                size="xs"
              >
                {row.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ChevronRight icon ────────────────────────────────────────────────────────
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className || "h-3 w-3"} aria-hidden="true">
      <path d="M6 12l4-4-4-4" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className={className || "h-3 w-3"} aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 01-9.77 3.43" />
      <path d="M2.5 8a5.5 5.5 0 019.77-3.43" />
      <polyline points="2.5 4 2.5 8 6.5 8" />
      <polyline points="13.5 12 13.5 8 9.5 8" />
    </svg>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [metrics, setMetrics]               = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]       = useState<Date | null>(null);

  async function fetchMetrics() {
    try {
      const res  = await fetch("/api/metrics", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.metrics) {
        setMetrics(json.metrics);
        setLastRefresh(new Date());
        setMetricsError(null);
      } else {
        setMetricsError(json.error ?? "Unknown error");
      }
    } catch (e: any) {
      setMetricsError(String(e?.message ?? e));
    } finally {
      setMetricsLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-full w-full flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#060c1a] dark:text-slate-50">

      {/* ── Ambient background ───────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 3-px identity stripe */}
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 40%,#0ea5e9 100%)" }} />
        {/* Top color wash — light mode */}
        <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-indigo-100/50 via-transparent to-transparent dark:hidden" />
        {/* Top color wash — dark mode */}
        <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-indigo-950/60 via-transparent to-transparent hidden dark:block" />
        {/* Top-left corner blob */}
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-indigo-400/20 blur-[90px] dark:bg-indigo-500/12" />
        {/* Bottom-right corner blob */}
        <div className="absolute -bottom-32 -right-24 h-[400px] w-[400px] rounded-full bg-violet-400/14 blur-[80px] dark:bg-violet-500/10" />
        {/* Center atmospheric glow */}
        <div className="absolute left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-400/8 blur-[120px] dark:bg-indigo-500/6" />
        {/* Dot grid — light mode */}
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.15) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* Dot grid — dark mode */}
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.18) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950" />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">

        {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">

            {/* Left: copy block */}
            <div className="flex-1 min-w-[260px] space-y-5">

              {/* Kicker pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <span className="relative flex h-[7px] w-[7px] items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative h-[7px] w-[7px] rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  AvidiaTech
                </span>
                <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  Live workspace
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-2.5">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[28px] dark:text-slate-50">
                  Your{" "}
                  <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 bg-clip-text text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-sky-300">
                    product intelligence
                  </span>
                  {" "}command center.
                </h1>
                <p className="max-w-lg text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Hub for ingestion, content, SEO, intelligence, automation, and developer tools.
                  Start with Extract, Describe, or SEO — then layer the rest as your stack matures.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { dot: "bg-amber-400",  text: "Ingestion-first architecture" },
                  { dot: "bg-violet-400", text: "Custom GPT instructions" },
                  { dot: "bg-emerald-400", text: "Metrics refresh every 30 s" },
                ].map((pill) => (
                  <div
                    key={pill.text}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11.5px] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                  >
                    <span className={`h-[5px] w-[5px] rounded-full ${pill.dot}`} />
                    {pill.text}
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/extract"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition-all duration-150 hover:bg-indigo-700 hover:shadow"
                >
                  Open AvidiaExtract
                  <ChevronRight className="h-3.5 w-3.5 opacity-80" />
                </Link>
                <Link
                  href="/dashboard/seo"
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Run SEO on a URL
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  View analytics
                </Link>
              </div>
            </div>

            {/* Right: live pipeline glance card */}
            <div className="w-full space-y-3 lg:w-[320px] lg:shrink-0">

              {/* Pipeline metrics */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-card-md dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-card-dark">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Pipeline
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">at a glance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {metricsError && (
                      <span className="text-[10px] text-rose-500">Error</span>
                    )}
                    {lastRefresh && !metricsLoading && (
                      <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-600">
                        {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <button
                      onClick={() => { setMetricsLoading(true); fetchMetrics(); }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="Refresh metrics"
                      aria-label="Refresh metrics"
                    >
                      <RefreshIcon />
                    </button>
                  </div>
                </div>
                <PipelineGlance metrics={metrics} loading={metricsLoading} />
              </div>

              {/* Recent activity */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Recent ingestions
                </p>
                {metricsLoading ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-8 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <RecentActivity metrics={metrics} />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRIMARY MODULE CARDS ─────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Core modules
            </p>
            <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800/80" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {primaryModules.map((mod) => {
              const metricValue =
                mod.metricKey === "ingestions" ? metrics?.ingestions.total
                : mod.metricKey === "describe"  ? metrics?.ingestions.describe_runs
                : mod.metricKey === "seo"       ? metrics?.ingestions.seo_runs
                : null;

              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className={[
                    "group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br",
                    mod.color.border,
                    mod.color.gradient,
                    "bg-white/95 dark:bg-slate-900/80",
                    "p-5",
                    "transition-all duration-150 hover:-translate-y-[2px]",
                    mod.color.glow,
                  ].join(" ")}
                >
                  {/* Top: badge + live status */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                      <span className={`h-[5px] w-[5px] rounded-full ${mod.color.dot}`} />
                      <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                        {mod.badge}
                      </span>
                    </div>
                    <Badge variant="live" dot size="xs">Live</Badge>
                  </div>

                  {/* Module name + description */}
                  <div className="flex-1 space-y-1.5">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {mod.name}
                    </h2>
                    <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {mod.description}
                    </p>
                  </div>

                  {/* Bottom: open link + metric */}
                  <div className="mt-5 flex items-center justify-between text-[11.5px]">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      Open module
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-[2px]" />
                    </span>
                    {metricValue != null && (
                      <span className="tabular-nums text-slate-400 dark:text-slate-500">
                        {metricValue.toLocaleString()} runs
                      </span>
                    )}
                  </div>

                  {/* Hover shimmer line at top */}
                  <span className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-transparent ${mod.color.shimmer} to-transparent transition-transform duration-300 group-hover:scale-x-100`} />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── SECONDARY MODULES + GUIDANCE ─────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              All modules
            </p>
            <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800/80" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Module group cards */}
            {secondaryModules.map((group) => (
              <div
                key={group.group}
                className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80"
              >
                {/* Group header */}
                <div className="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    {group.group}
                  </h3>
                </div>

                {/* Module list */}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isSoon = item.status === "soon";
                    return (
                      <li key={item.href}>
                        <Link
                          href={isSoon ? "#" : item.href}
                          aria-disabled={isSoon}
                          className={[
                            "flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors",
                            isSoon
                              ? "cursor-not-allowed text-slate-300 opacity-50 dark:text-slate-600"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100",
                          ].join(" ")}
                        >
                          <span className="font-medium">{item.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden text-[10px] text-slate-400 dark:text-slate-500 sm:block">
                              {item.tag}
                            </span>
                            <StatusBadge status={item.status} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Growth guidance card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
              {/* Header */}
              <div className="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Recommended path
                </h3>
              </div>

              {/* Steps */}
              <ol className="relative space-y-3 pl-4">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />
                {[
                  {
                    label: "AvidiaExtract",
                    href: "/dashboard/extract",
                    color: "text-amber-600 dark:text-amber-400",
                    dot: "bg-amber-400",
                    desc: "Normalize product data from manufacturer URLs.",
                  },
                  {
                    label: "AvidiaDescribe",
                    href: "/dashboard/describe",
                    color: "text-violet-600 dark:text-violet-400",
                    dot: "bg-violet-400",
                    desc: "Generate full descriptions from partial info.",
                  },
                  {
                    label: "AvidiaSEO",
                    href: "/dashboard/seo",
                    color: "text-emerald-600 dark:text-emerald-400",
                    dot: "bg-emerald-400",
                    desc: "Create SEO pages and JSON payloads.",
                  },
                  {
                    label: "Automation layer",
                    href: "#",
                    color: "text-slate-600 dark:text-slate-400",
                    dot: "bg-slate-300 dark:bg-slate-600",
                    desc: "Layer Variants, Audit, Feeds, Monitor.",
                  },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11.5px]">
                    <span className={`mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full ${step.dot}`} />
                    <div className="min-w-0">
                      <Link
                        href={step.href}
                        className={`font-semibold leading-snug hover:underline ${step.color}`}
                      >
                        {step.label}
                      </Link>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Quick links */}
              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Quick links
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Analytics",    href: "/dashboard/analytics" },
                    { label: "API keys",     href: "/settings/developer/api-keys" },
                    { label: "Billing",      href: "/settings/billing" },
                    { label: "Integrations", href: "/dashboard/integrations" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
