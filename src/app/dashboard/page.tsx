"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, StatusBadge, type ModuleStatus } from "@/components/ui/badge";

// ─── Module registry ──────────────────────────────────────────────────────────

const coreModules = [
  {
    name: "AvidiaExtract",
    short: "Extract",
    href: "/dashboard/extract",
    badge: "Ingestion",
    description: "Turn manufacturer URLs into clean, structured product JSON in seconds.",
    color: {
      gradient: "from-amber-50 to-orange-50 dark:from-amber-500/8 dark:to-orange-500/4",
      border:   "border-amber-200 dark:border-amber-500/30",
      dot:      "bg-amber-400",
      glow:     "hover:shadow-[0_8px_32px_rgba(251,191,36,0.2)]",
      shimmer:  "via-amber-300/70",
      accent:   "bg-amber-400",
      label:    "text-amber-700 dark:text-amber-400",
      labelBg:  "bg-amber-50 dark:bg-amber-500/10",
      labelBorder: "border-amber-200 dark:border-amber-500/30",
      bar:      "bg-gradient-to-r from-amber-400 to-orange-400",
      icon:     "text-amber-500",
    },
    status: "live" as ModuleStatus,
    metricKey: "ingestions",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    name: "AvidiaDescribe",
    short: "Describe",
    href: "/dashboard/describe",
    badge: "Copy engine",
    description: "Generate SEO-ready descriptions and HTML from rough notes or extracted data.",
    color: {
      gradient: "from-violet-50 to-indigo-50 dark:from-violet-500/8 dark:to-indigo-500/4",
      border:   "border-violet-200 dark:border-violet-500/30",
      dot:      "bg-violet-400",
      glow:     "hover:shadow-[0_8px_32px_rgba(139,92,246,0.2)]",
      shimmer:  "via-violet-300/70",
      accent:   "bg-violet-400",
      label:    "text-violet-700 dark:text-violet-400",
      labelBg:  "bg-violet-50 dark:bg-violet-500/10",
      labelBorder: "border-violet-200 dark:border-violet-500/30",
      bar:      "bg-gradient-to-r from-violet-400 to-indigo-400",
      icon:     "text-violet-500",
    },
    status: "live" as ModuleStatus,
    metricKey: "describe",
    iconPath: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    name: "AvidiaSEO",
    short: "SEO",
    href: "/dashboard/seo",
    badge: "URL → SEO",
    description: "Cascade ingested data into compliant, keyword-rich SEO pages automatically.",
    color: {
      gradient: "from-emerald-50 to-teal-50 dark:from-emerald-500/8 dark:to-teal-500/4",
      border:   "border-emerald-200 dark:border-emerald-500/30",
      dot:      "bg-emerald-400",
      glow:     "hover:shadow-[0_8px_32px_rgba(16,185,129,0.2)]",
      shimmer:  "via-emerald-300/70",
      accent:   "bg-emerald-400",
      label:    "text-emerald-700 dark:text-emerald-400",
      labelBg:  "bg-emerald-50 dark:bg-emerald-500/10",
      labelBorder: "border-emerald-200 dark:border-emerald-500/30",
      bar:      "bg-gradient-to-r from-emerald-400 to-teal-400",
      icon:     "text-emerald-500",
    },
    status: "live" as ModuleStatus,
    metricKey: "seo",
    iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
];

const moduleGroups = [
  {
    group: "AI Extraction & Content",
    dot: "bg-amber-400",
    items: [
      { name: "Translate", href: "/dashboard/translate", tag: "Multi-language",    status: "beta" as ModuleStatus },
      { name: "Cluster",   href: "/dashboard/cluster",   tag: "Similarity groups", status: "beta" as ModuleStatus },
      { name: "Studio",    href: "/dashboard/studio",    tag: "Experiments",       status: "beta" as ModuleStatus },
    ],
  },
  {
    group: "Data Intelligence",
    dot: "bg-cyan-400",
    items: [
      { name: "Match",    href: "/dashboard/match",    tag: "Catalog mapping", status: "beta" as ModuleStatus },
      { name: "Variants", href: "/dashboard/variants", tag: "Variations",      status: "beta" as ModuleStatus },
      { name: "Specs",    href: "/dashboard/specs",    tag: "Attributes",      status: "beta" as ModuleStatus },
      { name: "Docs",     href: "/dashboard/docs",     tag: "Manuals & PDFs",  status: "beta" as ModuleStatus },
      { name: "Images",   href: "/dashboard/images",   tag: "Visual library",  status: "beta" as ModuleStatus },
    ],
  },
  {
    group: "Commerce & Automation",
    dot: "bg-emerald-400",
    items: [
      { name: "Import",  href: "/dashboard/import",  tag: "Sync in",         status: "live" as ModuleStatus },
      { name: "Audit",   href: "/dashboard/audit",   tag: "QA & scoring",    status: "beta" as ModuleStatus },
      { name: "Price",   href: "/dashboard/price",   tag: "Pricing rules",   status: "beta" as ModuleStatus },
      { name: "Feeds",   href: "/dashboard/feeds",   tag: "Outbound feeds",  status: "beta" as ModuleStatus },
      { name: "Monitor", href: "/dashboard/monitor", tag: "Pipeline health", status: "live" as ModuleStatus },
    ],
  },
  {
    group: "Developer",
    dot: "bg-indigo-400",
    items: [
      { name: "Browser", href: "/dashboard/browser", tag: "Scraper tools", status: "beta" as ModuleStatus },
      { name: "API",     href: "/dashboard/api",     tag: "API access",    status: "live" as ModuleStatus },
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

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className={className || "h-4 w-4"} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

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
      className={className || "h-3.5 w-3.5"} aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 01-9.77 3.43" />
      <path d="M2.5 8a5.5 5.5 0 019.77-3.43" />
      <polyline points="2.5 4 2.5 8 6.5 8" />
      <polyline points="13.5 12 13.5 8 9.5 8" />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, dot, loading,
}: { label: string; value: string; sub?: string; dot: string; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {loading ? (
          <div className="mt-0.5 h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        ) : (
          <p className="text-[15px] font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 truncate text-[12px] text-slate-400 dark:text-slate-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Recent activity row ──────────────────────────────────────────────────────
function RecentIngestions({ metrics, loading }: { metrics: Metrics | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60" />
        ))}
      </div>
    );
  }
  const items = metrics?.recent.ingestions.slice(0, 5) ?? [];
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
        <p className="text-[12px] text-slate-400">No recent ingestions yet.</p>
        <Link href="/dashboard/extract" className="mt-2 inline-block text-[12px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Run your first extraction →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {items.map((row: any) => {
        const isOk   = row.status === "success" || row.status === "succeeded";
        const isFail = row.status === "failed";
        return (
          <div key={row.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] transition-colors hover:bg-white dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-900/80"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOk ? "bg-emerald-400" : isFail ? "bg-rose-400" : "bg-amber-400 animate-pulse"}`} />
              <span className="truncate font-mono text-[12px] text-slate-500 dark:text-slate-400">
                {row.source_url ? row.source_url.replace(/^https?:\/\//, "").slice(0, 44) : row.id?.slice(0, 12)}
              </span>
            </div>
            <Badge variant={isOk ? "success" : isFail ? "danger" : "warning"} size="xs">
              {row.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ─── Post-checkout success banner ────────────────────────────────────────────
function CheckoutSuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-white" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 4" />
          </svg>
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-emerald-900 dark:text-emerald-200">
            Payment successful — your account is now active!
          </p>
          <p className="mt-0.5 text-[12px] text-emerald-700 dark:text-emerald-400">
            Your subscription has been set up. All features are now unlocked. Welcome to AvidiaT!
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-emerald-500 transition hover:text-emerald-700 dark:hover:text-emerald-300"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [metrics, setMetrics]       = useState<Metrics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  // Detect Stripe redirect after successful checkout
  useEffect(() => {
    if (searchParams?.get("session_id")) {
      setShowCheckoutSuccess(true);
      // Clean up URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    }
    if (searchParams?.get("checkout_canceled") === "1") {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout_canceled");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  async function fetchMetrics() {
    try {
      const res  = await fetch("/api/metrics", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.metrics) {
        setMetrics(json.metrics);
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError(json.error ?? "Failed to load");
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full bg-slate-50 text-slate-900 dark:bg-[#060c1a] dark:text-slate-50">

      {/* ── Ambient background ───────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Identity stripe */}
        <div className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 40%,#0ea5e9 100%)" }} />
        {/* Color wash */}
        <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-indigo-100/40 via-transparent to-transparent dark:hidden" />
        <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-indigo-950/50 via-transparent to-transparent hidden dark:block" />
        {/* Blobs */}
        <div className="absolute -left-40 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-400/18 blur-[100px] dark:bg-indigo-500/10" />
        <div className="absolute -bottom-20 -right-20 h-[380px] w-[380px] rounded-full bg-violet-400/12 blur-[80px] dark:bg-violet-500/8" />
        <div className="absolute left-1/2 top-[25%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-300/8 blur-[120px] dark:bg-indigo-500/5" />
        {/* Dot grid */}
        <div className="absolute inset-0 dark:hidden"
          style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.12) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block"
          style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.16) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 to-transparent dark:from-[#060c1a]" />
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="relative space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

        {/* ── POST-CHECKOUT SUCCESS BANNER ────────────────────────────────── */}
        {showCheckoutSuccess && (
          <CheckoutSuccessBanner onDismiss={() => setShowCheckoutSuccess(false)} />
        )}

        {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
        <section className="space-y-5">

          {/* Top row: status pill + refresh */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative h-[7px] w-[7px] rounded-full bg-emerald-500" />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Live</span>
              <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-[12px] text-slate-500 dark:text-slate-400">Product Data OS</span>
            </div>
            <div className="flex items-center gap-2">
              {error && <span className="text-[12px] text-rose-500">Metrics failed</span>}
              {lastRefresh && !loading && (
                <span className="text-[12px] tabular-nums text-slate-400 dark:text-slate-600">
                  Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => { setLoading(true); fetchMetrics(); }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                title="Refresh" aria-label="Refresh metrics"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Your{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500 bg-clip-text text-transparent">
                product intelligence
              </span>{" "}
              command center.
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              Extract, describe, optimize, and automate your entire catalog — from a single URL to thousands of ready-to-publish pages.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/dashboard/extract"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[13px] font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:-translate-y-[1px] active:translate-y-0"
            >
              Start extracting
              <ChevronRight className="h-3.5 w-3.5 opacity-80" />
            </Link>
            <Link href="/dashboard/seo"
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Run SEO
            </Link>
            <Link href="/dashboard/analytics"
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Analytics
            </Link>
            <Link href="/dashboard/integrations"
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Integrations
            </Link>
          </div>

          {/* KPI strip — full width, no height mismatch */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Ingestions",     value: metrics?.ingestions.total.toLocaleString() ?? "—",        sub: metrics ? `${metrics.ingestions.success} ok` : undefined,                                     dot: "bg-emerald-400" },
              { label: "Pipeline runs",  value: metrics?.pipeline.total_runs.toLocaleString() ?? "—",     sub: metrics?.pipeline.success_rate != null ? `${metrics.pipeline.success_rate}% ok` : undefined,  dot: (metrics?.pipeline.running ?? 0) > 0 ? "bg-amber-400 animate-pulse" : "bg-cyan-400" },
              { label: "SEO runs",       value: metrics?.ingestions.seo_runs.toLocaleString() ?? "—",     sub: "AvidiaSEO",                                                                                    dot: "bg-emerald-400" },
              { label: "Describe runs",  value: metrics?.ingestions.describe_runs.toLocaleString() ?? "—", sub: "AvidiaDescribe",                                                                             dot: "bg-violet-400" },
              { label: "Imports",        value: metrics?.imports.total.toLocaleString() ?? "—",           sub: metrics?.imports.success_rate != null ? `${metrics.imports.success_rate}% done` : undefined,  dot: "bg-sky-400" },
              { label: "Monitor",        value: metrics?.monitor.watches.toLocaleString() ?? "—",         sub: metrics ? `${metrics.monitor.events} events` : undefined,                                      dot: "bg-rose-400" },
            ].map((row, i) => (
              <StatCard key={i} loading={loading} {...row} />
            ))}
          </div>
        </section>

        {/* ── CORE MODULES ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Core modules</p>
            <div className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {coreModules.map((mod) => {
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
                    "group relative flex flex-col overflow-hidden rounded-2xl border p-5",
                    "bg-gradient-to-br",
                    mod.color.gradient,
                    mod.color.border,
                    "transition-all duration-200 hover:-translate-y-0.5",
                    mod.color.glow,
                  ].join(" ")}
                >
                  {/* Shimmer on hover */}
                  <span className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-transparent ${mod.color.shimmer} to-transparent transition-transform duration-300 group-hover:scale-x-100`} />

                  {/* Badge row */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${mod.color.labelBg} ${mod.color.labelBorder} ${mod.color.label}`}>
                      <span className={`h-[5px] w-[5px] rounded-full ${mod.color.dot}`} />
                      {mod.badge}
                    </span>
                    <Badge variant="live" dot size="xs">Live</Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50">{mod.name}</h2>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{mod.description}</p>
                  </div>

                  {/* Bottom row */}
                  <div className="mt-4 flex items-center justify-between text-[11.5px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      Open module
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {metricValue != null && (
                      <span className="tabular-nums text-slate-400 dark:text-slate-500">
                        {metricValue.toLocaleString()} runs
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── LOWER SPLIT: All modules + Activity ──────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">

          {/* Left 2/3: all module groups */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">All modules</p>
              <div className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {moduleGroups.map((group) => (
                <div key={group.group}
                  className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/80"
                >
                  {/* Group header */}
                  <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <span className={`h-1.5 w-1.5 rounded-full ${group.dot}`} />
                    <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {group.group}
                    </h3>
                  </div>

                  {/* Items */}
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                        >
                          <span className="font-medium">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="hidden text-[12px] text-slate-400 dark:text-slate-500 sm:block">{item.tag}</span>
                            <StatusBadge status={item.status} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Right 1/3: recent activity + recommended path */}
          <div className="flex flex-col gap-4">
            {/* Recent ingestions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Recent ingestions
                </p>
                <Link href="/dashboard/analytics"
                  className="text-[10.5px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  View all →
                </Link>
              </div>
              <RecentIngestions metrics={metrics} loading={loading} />
            </div>

            {/* Recommended path */}
            <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="mb-3 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Recommended path
                </h3>
              </div>

              <ol className="relative space-y-3 pl-4">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />
                {[
                  { label: "AvidiaExtract",  href: "/dashboard/extract",  color: "text-amber-600 dark:text-amber-400",   dot: "bg-amber-400",   desc: "Ingest and normalize product URLs." },
                  { label: "AvidiaDescribe", href: "/dashboard/describe", color: "text-violet-600 dark:text-violet-400", dot: "bg-violet-400", desc: "Generate descriptions from extracted data." },
                  { label: "AvidiaSEO",      href: "/dashboard/seo",      color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", desc: "Publish SEO-ready pages and JSON." },
                  { label: "Automation",     href: "#",                   color: "text-slate-500 dark:text-slate-400",   dot: "bg-slate-300 dark:bg-slate-600", desc: "Layer Audit, Feeds, Monitor." },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11.5px]">
                    <span className={`mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full ${step.dot}`} />
                    <div className="min-w-0">
                      <Link href={step.href} className={`font-semibold hover:underline ${step.color}`}>{step.label}</Link>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Quick links */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Quick links</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Pricing",      href: "/dashboard/pricing" },
                    { label: "API Keys",     href: "/settings/developer/api-keys" },
                    { label: "Billing",      href: "/settings/billing" },
                    { label: "Docs",         href: "/docs" },
                  ].map((l) => (
                    <Link key={l.href} href={l.href}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-medium text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
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
