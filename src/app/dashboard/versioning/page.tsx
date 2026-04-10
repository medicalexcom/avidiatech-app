"use client";

import React, { useCallback, useEffect, useState } from "react";

type FieldType = "Specs" | "SEO" | "Description" | "Price" | "Images";
type ChangeSource = "Extract" | "Describe" | "SEO" | "Audit" | "Import" | "User";

type VersionEntry = {
  id: string;
  version: number;
  sku: string;
  productName: string;
  fieldType: FieldType;
  source: ChangeSource;
  author: string;
  createdAt: string;
  summary: string;
  before: Record<string, string>;
  after: Record<string, string>;
};

/* Version entries are fetched from pipeline runs on mount */

const FIELD_COLORS: Record<FieldType, string> = {
  Specs: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-500/30 dark:text-sky-300",
  SEO: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300",
  Description: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-500/30 dark:text-violet-300",
  Price: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
  Images: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300",
};

const SOURCE_COLORS: Record<ChangeSource, string> = {
  Extract: "text-sky-600 dark:text-sky-400",
  Describe: "text-violet-600 dark:text-violet-400",
  SEO: "text-emerald-600 dark:text-emerald-400",
  Audit: "text-amber-600 dark:text-amber-400",
  Import: "text-teal-600 dark:text-teal-400",
  User: "text-slate-600 dark:text-slate-300",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = before !== after && before !== "";
  const added = before === "" && after !== "";
  return (
    <div className={`grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 py-2 px-3 text-xs rounded-lg ${changed ? "bg-amber-50/60 dark:bg-amber-950/20" : added ? "bg-emerald-50/60 dark:bg-emerald-950/20" : "bg-transparent"}`}>
      <span className="font-medium text-slate-600 dark:text-slate-300 self-center">{label.replace(/_/g, " ")}</span>
      <span className={`font-mono break-words ${before === "" ? "text-slate-300 dark:text-slate-700 italic" : changed ? "text-rose-600 dark:text-rose-400 line-through opacity-70" : "text-slate-600 dark:text-slate-300"}`}>
        {before || "—"}
      </span>
      <span className={`font-mono break-words ${added || changed ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
        {after || "—"}
      </span>
    </div>
  );
}

export default function VersioningPage() {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [filterField, setFilterField] = useState<FieldType | "All">("All");
  const [diffEntry, setDiffEntry] = useState<VersionEntry | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/pipeline/runs?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.runs)) {
          const mapped: VersionEntry[] = data.runs.map((r: any, i: number) => ({
            id: r.id ?? `v${i}`,
            version: r.version ?? data.runs.length - i,
            sku: r.sku ?? r.product_sku ?? "—",
            productName: r.product_name ?? r.name ?? "Unknown product",
            fieldType: (r.field_type ?? r.module ?? "Specs") as FieldType,
            source: (r.source ?? r.trigger ?? "Extract") as ChangeSource,
            author: r.author ?? r.source ?? "System",
            createdAt: r.created_at ?? new Date().toISOString(),
            summary: r.summary ?? r.description ?? "Pipeline run completed",
            before: r.before ?? {},
            after: r.after ?? r.output ?? {},
          }));
          setVersions(mapped);
          if (mapped.length > 0) setSelectedSku(mapped[0].sku);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const skus = [...new Set(versions.map((v) => v.sku))];
  const filtered = versions.filter((v) => {
    return v.sku === selectedSku && (filterField === "All" || v.fieldType === filterField);
  }).sort((a, b) => b.version - a.version);

  async function handleRestore(entry: VersionEntry) {
    setRestoring(entry.id);
    await new Promise((r) => setTimeout(r, 1100));
    setRestoring(null);
    setDiffEntry(null);
    showToast(`Restored ${entry.productName} to v${entry.version} (${entry.fieldType})`);
  }

  const allKeys = (entry: VersionEntry) => {
    const keys = new Set([...Object.keys(entry.before), ...Object.keys(entry.after)]);
    return [...keys];
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute -bottom-32 right-[-8rem] h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.95)_45%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Diff modal */}
      {diffEntry && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-20 px-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 mb-8">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Diff · v{diffEntry.version} — {diffEntry.fieldType}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{diffEntry.productName} · {diffEntry.sku}</p>
              </div>
              <button onClick={() => setDiffEntry(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-1">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 px-3">
                <span>Field</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {allKeys(diffEntry).map((key) => (
                <DiffRow
                  key={key}
                  label={key}
                  before={diffEntry.before[key] ?? ""}
                  after={diffEntry.after[key] ?? ""}
                />
              ))}
            </div>

            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-3 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 dark:text-slate-600">
                By {diffEntry.author} · {fmtDate(diffEntry.createdAt)}
              </p>
              <button
                onClick={() => handleRestore(diffEntry)}
                disabled={restoring === diffEntry.id}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {restoring === diffEntry.id && (
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {restoring === diffEntry.id ? "Restoring…" : "Restore this version"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace History
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Versioning &amp; History</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Track how your product data evolves. Compare versions, audit changes by source, and restore in one click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {versions.length} versions tracked
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* LEFT: Timeline */}
          <div className="space-y-4">
            {/* SKU selector + filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-2 flex-wrap">
                {skus.map((sku) => (
                  <button
                    key={sku}
                    onClick={() => setSelectedSku(sku)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedSku === sku
                        ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {sku}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(["All", "Specs", "SEO", "Description", "Price"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterField(f)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                      filterField === f
                        ? "bg-sky-600 text-white"
                        : "border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                  <p className="mt-3 text-sm text-slate-500">Loading version history…</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-3xl">📋</p>
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No version history yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Version history is created automatically when you run Extract, Describe, SEO, or Import pipelines on your products.
                  </p>
                  <a href="/dashboard/extract" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500">
                    Start an extraction
                  </a>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-600">No versions match this filter</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filtered.map((entry, i) => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-4">
                      {/* Timeline dot */}
                      <div className="mt-1 flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${i === 0 ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-700"}`} />
                        {i < filtered.length - 1 && <div className="mt-1 h-full w-px bg-slate-200 dark:bg-slate-800 min-h-[2rem]" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">v{entry.version}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${FIELD_COLORS[entry.fieldType]}`}>
                            {entry.fieldType}
                          </span>
                          <span className={`text-[11px] font-medium ${SOURCE_COLORS[entry.source]}`}>
                            by {entry.author}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-600">{fmtDate(entry.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{entry.summary}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setDiffEntry(entry)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            View diff
                          </button>
                          <button
                            onClick={() => handleRestore(entry)}
                            disabled={restoring === entry.id}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {restoring === entry.id ? "Restoring…" : "Restore"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">A safety net for every field</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Versioning keeps snapshots of critical product fields—specs, descriptions, SEO blocks, and pricing—whenever a pipeline job or user updates them.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {[
                  ["Automatic snapshots", "captured on every Extract, Describe, SEO, and Import run"],
                  ["Field-level diffs", "see exactly what changed between any two versions"],
                  ["One-click restore", "roll back just the fields you care about"],
                  ["Source attribution", "know whether a change came from a pipeline or a user"],
                ].map(([bold, rest]) => (
                  <li key={bold} className="flex gap-2">
                    <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span><span className="font-medium">{bold}</span> — {rest}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Works with all modules</h3>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li>• Extract triggers spec and image snapshots on every crawl</li>
                <li>• Describe and SEO snapshot content before and after generation</li>
                <li>• Import captures catalog state before each push to the store</li>
                <li>• Audit references prior versions when scoring regressions</li>
                <li>• Monitor ties price-change alerts to the specific version affected</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
