"use client";

import React, { useEffect, useState, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Metrics {
  ingestions: { total: number; success: number; failed: number; pending: number; seo_runs: number; describe_runs: number };
  pipeline: { total_runs: number; succeeded: number; failed: number; running: number; success_rate: number | null };
  imports: { total: number; completed: number; failed: number; success_rate: number | null };
  bulk: { total: number; completed: number };
  monitor: { watches: number; events: number };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

// ─── Ring chart ───────────────────────────────────────────────────────────────
function Ring({
  pct,
  size = 60,
  strokeWidth = 7,
  color,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-slate-800" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

// ─── Pipeline node ─────────────────────────────────────────────────────────────
function PipelineNode({
  label,
  sublabel,
  value,
  color,
  accent,
  pct,
  loading,
}: {
  label: string;
  sublabel: string;
  value: string;
  color: string;
  accent: string;
  pct: number;
  loading: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl border px-4 py-3 shadow-sm"
        style={{ borderColor: `${color}40`, background: `${accent}10`, minWidth: 100 }}
      >
        {loading ? (
          <Sk className="h-8 w-16 rounded" />
        ) : (
          <>
            <div className="relative">
              <Ring pct={pct} color={color} size={52} strokeWidth={6} />
              <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                style={{ color }}
              >
                {Math.round(pct)}%
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-50">{value}</p>
          </>
        )}
      </div>
      <p className="text-center text-[11px] font-medium text-slate-800 dark:text-slate-200">{label}</p>
      <p className="text-center text-[10px] text-slate-500 dark:text-slate-400">{sublabel}</p>
    </div>
  );
}

// ─── Arrow connector ──────────────────────────────────────────────────────────
function Arrow() {
  return (
    <div className="hidden items-center sm:flex">
      <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
        <path d="M0 6 H28 M22 1 L28 6 L22 11" stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── KPI tile ────────────────────────────────────────────────────────────────
function KpiTile({ label, value, color, loading }: { label: string; value: string; color: string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      {loading ? <Sk className="mt-1 h-5 w-14" /> : (
        <p className="mt-0.5 text-[15px] font-bold tabular-nums" style={{ color }}>{value}</p>
      )}
    </div>
  );
}

// ─── Saved view card ─────────────────────────────────────────────────────────
function SavedView({
  title,
  description,
  tag,
  tagColor,
  onClick,
  active,
}: {
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-indigo-400/60 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-500/10"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: `${tagColor}20`, color: tagColor }}>
          {tag}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{description}</p>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VisualizePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("pipeline");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      if (data?.ok && data.metrics) {
        setMetrics(data.metrics);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(iv);
  }, [fetchMetrics]);

  const fmt = (n?: number | null) => (n == null ? "—" : n.toLocaleString());
  const pctFmt = (n?: number | null) => (n == null ? "—" : `${n}%`);

  const ing = metrics?.ingestions;
  const pip = metrics?.pipeline;
  const imp = metrics?.imports;

  // Pipeline nodes
  const ingSuccessPct = ing && ing.total > 0 ? (ing.success / ing.total) * 100 : 0;
  const pipSuccessPct = pip?.success_rate ?? 0;
  const impSuccessPct = imp?.success_rate ?? 0;
  const bulkPct = metrics?.bulk
    ? metrics.bulk.total > 0 ? (metrics.bulk.completed / metrics.bulk.total) * 100 : 0
    : 0;

  const savedViews = [
    { id: "pipeline", title: "Pipeline health", description: "Ingestion → pipeline → import flow with live success rates", tag: "Live", tagColor: "#10b981" },
    { id: "modules", title: "Module usage", description: "Describe, SEO, Extract, Import and Bulk job volumes", tag: "Live", tagColor: "#6366f1" },
    { id: "monitor", title: "Monitor & alerts", description: "Active watches, events, and monitoring signals", tag: "Live", tagColor: "#ec4899" },
    { id: "coverage", title: "Catalog coverage", description: "Products enriched vs. pending across modules", tag: "Planned", tagColor: "#f59e0b" },
  ];

  return (
    <PageShell glow="violet">

      {/* ── HEADER ── */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            Workspace · Visualize
            <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-violet-600 dark:text-violet-200">Live pipeline view</span>
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-slate-50">Visualize</h1>
          <p className="max-w-2xl text-sm text-slate-700 dark:text-slate-300">
            Interactive pipeline charts and KPI dashboards built on live Supabase data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {lastRefresh && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); fetchMetrics(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* ── TOP KPI STRIP ── */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total ingestions" value={fmt(ing?.total)} color="#10b981" loading={loading} />
        <KpiTile label="Pipeline success rate" value={pctFmt(pip?.success_rate)} color="#6366f1" loading={loading} />
        <KpiTile label="Monitor watches" value={fmt(metrics?.monitor?.watches)} color="#ec4899" loading={loading} />
        <KpiTile label="Running now" value={fmt(pip?.running)} color="#38bdf8" loading={loading} />
      </section>

      {/* ── MAIN GRID ── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

        {/* LEFT: pipeline flow + active chart */}
        <div className="space-y-5">

          {/* Pipeline flow diagram */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pipeline flow — live health
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-0.5 text-[10px] text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-around gap-3 sm:gap-0">
              <PipelineNode
                label="AvidiaExtract"
                sublabel={`${fmt(ing?.total)} ingested`}
                value={fmt(ing?.total)}
                color="#10b981"
                accent="#10b981"
                pct={ingSuccessPct}
                loading={loading}
              />
              <Arrow />
              <PipelineNode
                label="Pipeline runs"
                sublabel={`${fmt(pip?.total_runs)} total`}
                value={fmt(pip?.total_runs)}
                color="#6366f1"
                accent="#6366f1"
                pct={pipSuccessPct}
                loading={loading}
              />
              <Arrow />
              <PipelineNode
                label="AvidiaImport"
                sublabel={`${fmt(imp?.total)} jobs`}
                value={fmt(imp?.total)}
                color="#f59e0b"
                accent="#f59e0b"
                pct={impSuccessPct}
                loading={loading}
              />
              <Arrow />
              <PipelineNode
                label="Bulk jobs"
                sublabel={`${fmt(metrics?.bulk?.total)} batches`}
                value={fmt(metrics?.bulk?.total)}
                color="#8b5cf6"
                accent="#8b5cf6"
                pct={bulkPct}
                loading={loading}
              />
            </div>

            {/* Summary bar below the flow */}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
              {[
                { label: "Ingest success", value: `${fmt(ing?.success)} ✓`, color: "#10b981" },
                { label: "Pipeline errors", value: `${fmt(pip?.failed)} ✗`, color: "#f43f5e" },
                { label: "SEO runs", value: fmt(ing?.seo_runs), color: "#06b6d4" },
                { label: "Describe runs", value: fmt(ing?.describe_runs), color: "#a78bfa" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  {loading ? <Sk className="mx-auto h-5 w-12" /> : (
                    <p className="text-[15px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                  )}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module comparison chart — horizontal stacked bars */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Module comparison</h2>

            {activeView === "pipeline" && (
              <div className="space-y-4">
                {[
                  {
                    label: "Ingestion",
                    items: [
                      { label: "Success", value: ing?.success ?? 0, color: "#10b981" },
                      { label: "Failed", value: ing?.failed ?? 0, color: "#f43f5e" },
                      { label: "Pending", value: ing?.pending ?? 0, color: "#f59e0b" },
                    ],
                  },
                  {
                    label: "Pipeline",
                    items: [
                      { label: "Succeeded", value: pip?.succeeded ?? 0, color: "#6366f1" },
                      { label: "Failed", value: pip?.failed ?? 0, color: "#f43f5e" },
                      { label: "Running", value: pip?.running ?? 0, color: "#38bdf8" },
                    ],
                  },
                  {
                    label: "Imports",
                    items: [
                      { label: "Completed", value: imp?.completed ?? 0, color: "#f59e0b" },
                      { label: "Failed", value: imp?.failed ?? 0, color: "#f43f5e" },
                    ],
                  },
                  {
                    label: "Bulk",
                    items: [
                      { label: "Completed", value: metrics?.bulk?.completed ?? 0, color: "#8b5cf6" },
                      { label: "Total", value: metrics?.bulk?.total ?? 0, color: "#c4b5fd" },
                    ],
                  },
                ].map((row) => {
                  const total = row.items.reduce((s, i) => s + i.value, 0) || 1;
                  return (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{row.label}</span>
                        {loading ? <Sk className="h-3 w-8" /> : (
                          <span className="tabular-nums text-slate-500">{total.toLocaleString()} total</span>
                        )}
                      </div>
                      {loading ? (
                        <Sk className="h-3.5 w-full rounded-full" />
                      ) : (
                        <div className="flex h-3.5 w-full overflow-hidden rounded-full">
                          {row.items.map((item) => (
                            <div
                              key={item.label}
                              title={`${item.label}: ${item.value}`}
                              className="transition-all duration-700"
                              style={{
                                width: `${(item.value / total) * 100}%`,
                                background: item.color,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === "modules" && (
              <div className="space-y-3">
                {[
                  { name: "AvidiaDescribe", value: ing?.describe_runs ?? 0, color: "#6366f1" },
                  { name: "AvidiaSEO", value: ing?.seo_runs ?? 0, color: "#06b6d4" },
                  { name: "AvidiaExtract", value: ing?.total ?? 0, color: "#10b981" },
                  { name: "AvidiaImport", value: imp?.total ?? 0, color: "#f59e0b" },
                  { name: "Bulk", value: metrics?.bulk?.total ?? 0, color: "#8b5cf6" },
                ].map((row) => {
                  const max = Math.max(ing?.total ?? 0, ing?.describe_runs ?? 0, ing?.seo_runs ?? 0, imp?.total ?? 0, metrics?.bulk?.total ?? 0, 1);
                  return (
                    <div key={row.name}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
                        <span className="tabular-nums text-slate-500">{row.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(row.value / max) * 100}%`, background: row.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === "monitor" && (
              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-500/30 dark:bg-pink-500/10">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-pink-600 dark:text-pink-300">Active watches</p>
                    {loading ? <Sk className="mt-2 h-7 w-14" /> : (
                      <p className="mt-1 text-2xl font-bold text-pink-700 dark:text-pink-200">{fmt(metrics?.monitor?.watches)}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-violet-600 dark:text-violet-300">Events tracked</p>
                    {loading ? <Sk className="mt-2 h-7 w-14" /> : (
                      <p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-200">{fmt(metrics?.monitor?.events)}</p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Monitor watches track price changes, availability, and product data across connected stores. Events are recorded each time a watch triggers.</p>
              </div>
            )}

            {activeView === "coverage" && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-[11px] text-slate-400 dark:border-slate-800">
                Catalog coverage view — requires enrichment data from AvidiaExtract + Specs.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: saved views + legend */}
        <div className="space-y-5">
          {/* Saved views selector */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Dashboard views</h2>
            <div className="space-y-2">
              {savedViews.map((view) => (
                <SavedView
                  key={view.id}
                  title={view.title}
                  description={view.description}
                  tag={view.tag}
                  tagColor={view.tagColor}
                  onClick={() => setActiveView(view.id)}
                  active={activeView === view.id}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Status legend</h2>
            <div className="space-y-2 text-[11px]">
              {[
                { label: "Success / succeeded", color: "#10b981" },
                { label: "Failed / error", color: "#f43f5e" },
                { label: "Pending / queued", color: "#f59e0b" },
                { label: "Running / active", color: "#38bdf8" },
                { label: "SEO module", color: "#06b6d4" },
                { label: "Describe module", color: "#a78bfa" },
                { label: "Monitor / watch", color: "#ec4899" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Quick stats</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Ingest success", value: `${fmt(ing?.success)}`, color: "#10b981" },
                { label: "Ingest failed", value: `${fmt(ing?.failed)}`, color: "#f43f5e" },
                { label: "Pip. running", value: `${fmt(pip?.running)}`, color: "#38bdf8" },
                { label: "Monitor events", value: `${fmt(metrics?.monitor?.events)}`, color: "#ec4899" },
              ].map((item) => (
                <KpiTile key={item.label} label={item.label} value={item.value} color={item.color} loading={loading} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            Data refreshes every 30s from live Supabase. Toggle dashboard views above to switch the chart.
          </div>
        </div>
      </section>
    </PageShell>
  );
}
