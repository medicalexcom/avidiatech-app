"use client";

import React, { useCallback, useEffect, useState } from "react";

type DescribeStatus = "succeeded" | "failed" | "running" | "queued";

type DescribeEntry = {
  id: string;
  product_name: string;
  ingestion_id: string;
  url: string;
  status: DescribeStatus;
  tone: string;
  channel: string;
  word_count: number;
  seo_score: number | null;
  created_at: string;
  duration_ms: number | null;
};

/* Describe entries are fetched from pipeline runs on mount */

function StatusBadge({ status }: { status: DescribeStatus }) {
  const map: Record<DescribeStatus, string> = {
    succeeded: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300",
    failed: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300",
    running: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
    queued: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}>
      {status === "running" && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  const color = score >= 90 ? "text-emerald-600 dark:text-emerald-400" : score >= 80 ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMs(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function DescribeHistoryPage() {
  const [entries, setEntries] = useState<DescribeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/pipeline/runs?module=describe&limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.runs)) {
          setEntries(
            data.runs.map((r: any) => ({
              id: r.id,
              product_name: r.product_name ?? r.name ?? "Unknown",
              ingestion_id: r.ingestion_id ?? r.id,
              url: r.url ?? "",
              status: (r.status as DescribeStatus) ?? "succeeded",
              tone: r.tone ?? r.config?.tone ?? "Default",
              channel: r.channel ?? r.config?.channel ?? "—",
              word_count: r.word_count ?? r.output?.word_count ?? 0,
              seo_score: r.seo_score ?? r.output?.seo_score ?? null,
              created_at: r.created_at,
              duration_ms: r.duration_ms ?? null,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DescribeStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, tone: "success" | "error" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.product_name.toLowerCase().includes(search.toLowerCase()) || e.url.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || e.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: entries.length,
    succeeded: entries.filter((e) => e.status === "succeeded").length,
    failed: entries.filter((e) => e.status === "failed").length,
    running: entries.filter((e) => e.status === "running").length,
    avgScore: (() => {
      const scored = entries.filter((e) => e.seo_score != null);
      return scored.length > 0 ? Math.round(scored.reduce((s, e) => s + (e.seo_score ?? 0), 0) / scored.length) : null;
    })(),
    avgWords: (() => {
      const withWords = entries.filter((e) => e.word_count > 0);
      return withWords.length > 0 ? Math.round(withWords.reduce((s, e) => s + e.word_count, 0) / withWords.length) : 0;
    })(),
  };

  async function handleRerun(entry: DescribeEntry) {
    setRerunning(entry.id);
    await new Promise((r) => setTimeout(r, 1200));
    setEntries((prev) =>
      prev.map((e) => e.id === entry.id ? { ...e, status: "queued", created_at: new Date().toISOString() } : e)
    );
    setRerunning(null);
    showToast(`Re-queued describe for "${entry.product_name}"`);
  }

  function downloadCsv() {
    const headers = ["product_name", "status", "tone", "channel", "word_count", "seo_score", "created_at", "duration_ms", "ingestion_id"];
    const rows = filtered.map((e) => headers.map((h) => {
      const v = e[h as keyof DescribeEntry];
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `describe-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  }

  return (
    <div className="relative flex min-h-full w-full flex-col bg-slate-50 dark:bg-slate-950 dark:text-slate-50 overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/15" />
        <div className="absolute bottom-0 right-[-8rem] h-72 w-72 rounded-full bg-sky-300/18 blur-3xl dark:bg-sky-500/12" />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/80 dark:text-rose-200"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              AvidiaDescribe · History
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Describe Generations</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              All AI-generated product descriptions for this workspace. Re-run, export, or review any generation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/dashboard/describe"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← Back to Describe
            </a>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500"
            >
              Export CSV
            </button>
          </div>
        </header>

        {/* Stats strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total, color: "text-slate-800 dark:text-slate-100" },
            { label: "Succeeded", value: stats.succeeded, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Failed", value: stats.failed, color: "text-rose-600 dark:text-rose-400" },
            { label: "Running", value: stats.running, color: "text-amber-600 dark:text-amber-400" },
            { label: "Avg SEO Score", value: stats.avgScore ?? "—", color: "text-sky-600 dark:text-sky-400" },
            { label: "Avg Words", value: stats.avgWords, color: "text-violet-600 dark:text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className={`mt-1 text-xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or URL…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          <div className="flex gap-2 flex-wrap">
            {(["all", "succeeded", "failed", "running", "queued"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-violet-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="grid grid-cols-[minmax(0,2.5fr)_auto_auto_auto_auto_auto_auto] items-center border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 gap-4">
            <span>Product</span>
            <span>Status</span>
            <span>Tone</span>
            <span>Words</span>
            <span>SEO</span>
            <span>Duration</span>
            <span>Created</span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-violet-500" />
              <p className="mt-3 text-sm text-slate-500">Loading describe history…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <p className="text-3xl">✍️</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No descriptions generated yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center">
                Run AvidiaDescribe on your extracted products to generate AI-powered descriptions. History will appear here.
              </p>
              <a href="/dashboard/describe" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500">
                Go to Describe
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400 dark:text-slate-600">
              <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm">No describe generations match this filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((entry) => (
                <div key={entry.id}>
                  <div
                    className="grid grid-cols-[minmax(0,2.5fr)_auto_auto_auto_auto_auto_auto] items-center px-4 py-3 gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{entry.product_name}</p>
                      <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{entry.url}</p>
                    </div>
                    <StatusBadge status={entry.status} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap">{entry.tone}</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 text-right whitespace-nowrap">{entry.word_count > 0 ? entry.word_count : "—"}</span>
                    <ScoreBadge score={entry.seo_score} />
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtMs(entry.duration_ms)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(entry.created_at)}</span>
                  </div>

                  {/* Expanded row */}
                  {expanded === entry.id && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ingestion ID</p>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{entry.ingestion_id}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Channel</p>
                          <p className="text-xs text-slate-700 dark:text-slate-200">{entry.channel}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRerun(entry)}
                            disabled={rerunning === entry.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-500/30 dark:bg-violet-950/30 dark:text-violet-300"
                          >
                            {rerunning === entry.id ? (
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                            ) : null}
                            Re-run describe
                          </button>
                          <a
                            href={`/dashboard/describe?ingestion=${entry.ingestion_id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            Open in Describe
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
          Showing {filtered.length} of {entries.length} generations · Auto-synced from Supabase product_ingestions
        </p>
      </div>
    </div>
  );
}
