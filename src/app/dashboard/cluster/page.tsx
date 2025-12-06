"use client";

/**
 * Cluster product page
 *
 * AvidiaCluster groups similar products together using machine learning to
 * simplify taxonomy management and deduplication.
 */

import React from "react";

const sampleClusters = [
  {
    label: "Cluster #12 • IV Poles",
    size: 23,
    cohesion: "0.94",
    topSignals: ["Brand", "Height range", "Base type"],
  },
  {
    label: "Cluster #47 • Wheelchairs",
    size: 18,
    cohesion: "0.91",
    topSignals: ["Seat width", "Frame material", "Footrest"],
  },
  {
    label: "Cluster #103 • Exam Tables",
    size: 9,
    cohesion: "0.88",
    topSignals: ["Electric vs. manual", "Weight capacity", "Surface type"],
  },
];

export default function ClusterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background gradients + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-8 lg:px-8">
        {/* HERO ROW */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-5 py-6 shadow-[0_0_40px_rgba(129,140,248,0.35)] lg:px-7 lg:py-7 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(129,140,248,0.45)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left copy */}
            <div className="min-w-[260px] flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-950/90 dark:text-slate-300">
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-violet-400/80 bg-slate-100 dark:bg-slate-900">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                </span>
                AvidiaCluster • Data intelligence
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                  Cluster your catalog into{" "}
                  <span className="bg-gradient-to-r from-violet-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent dark:from-violet-300 dark:via-sky-300 dark:to-cyan-300">
                    clean, explainable product groups
                  </span>
                  .
                </h1>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  AvidiaCluster uses similarity signals from your ingested data
                  to group near-duplicate and related products, so you can fix
                  taxonomy, deduplicate SKUs, and prepare merch-ready
                  collections without manual spreadsheets.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/50 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>Learns from AvidiaExtract&apos;s normalized JSON.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Outputs cluster IDs, similarity scores, and top signals.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Designed for deduping and taxonomy clean-up at scale.</span>
                </div>
              </div>
            </div>

            {/* Right: high-level cluster snapshot */}
            <div className="mt-4 w-full lg:mt-0 lg:w-[360px] xl:w-[400px]">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/95">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Cluster snapshot (example)
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Wire to /cluster later
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between rounded-xl border border-violet-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-violet-400" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Catalog coverage
                      </span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">
                      ~82% clustered
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Average cohesion
                      </span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">
                      0.91
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Potential duplicates
                      </span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">
                      47 candidates
                    </span>
                  </div>
                </div>
                <p className="pt-1 text-[10px] text-slate-500 dark:text-slate-500">
                  Later, this card can show live stats per tenant (SKUs
                  clustered, average cohesion, number of merge suggestions).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT: configuration + preview */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr,1.1fr] lg:gap-6">
          {/* LEFT: clustering configuration */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Clustering setup
                </h2>
                <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
                  Choose how aggressively you want to group similar items and
                  which fields matter most. AvidiaCluster will emit cluster IDs
                  and similarity scores you can feed into Match, Variants, or
                  your own tools.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                Config-only UI — wire API later
              </span>
            </header>

            <form className="space-y-3 text-xs">
              {/* Source scope */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Source scope
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  defaultValue="all"
                >
                  <option value="all">All ingested products (recommended)</option>
                  <option value="brand">Single brand only</option>
                  <option value="subset">
                    Subset (filtered by tag, category, or import batch)
                  </option>
                </select>
              </div>

              {/* Similarity threshold */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Similarity threshold
                    <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400">
                      (0.0 – 1.0)
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0.7}
                    max={0.99}
                    step={0.01}
                    defaultValue={0.9}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Loose (0.7)</span>
                    <span>Strict (0.99)</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Minimum cluster size
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    defaultValue="3"
                  >
                    <option value="2">2 items</option>
                    <option value="3">3 items</option>
                    <option value="5">5 items</option>
                    <option value="10">10 items</option>
                  </select>
                </div>
              </div>

              {/* Feature importance */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Fields to prioritize
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  AvidiaCluster already uses the full normalized payload, but
                  you can nudge which features matter most for your catalog and
                  downstream workflows.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    "Name & model",
                    "Brand",
                    "Specs / dimensions",
                    "UPC / GTIN",
                    "Category / taxonomy",
                    "Keywords & tags",
                  ].map((label) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-800 hover:border-violet-500/40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-900/90"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={
                          label === "Name & model" || label === "Brand"
                        }
                        className="h-3 w-3 rounded border border-slate-400 bg-white text-violet-500 focus:ring-violet-500/40 dark:border-slate-500 dark:bg-slate-900"
                      />
                      <span className="text-[11px]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-xs font-semibold text-slate-50 shadow-md shadow-violet-500/40 transition hover:-translate-y-[1px] hover:bg-violet-400 dark:text-slate-950"
                >
                  Run clustering (sample)
                </button>
                <button
                  type="button"
                  className="text-[11px] text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Save configuration preset
                </button>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  In production, this should call your /api/v1/cluster endpoint
                  with the options above.
                </span>
              </div>
            </form>
          </div>

          {/* RIGHT: cluster explorer preview */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Cluster explorer
                </h2>
                <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
                  Preview how AvidiaCluster groups similar products. In a live
                  setup, you&apos;d scroll clusters, inspect members, and export
                  IDs into Match, Variants, or downstream systems.
                </p>
              </div>
              <div className="hidden flex-col items-end text-[10px] text-slate-400 sm:flex dark:text-slate-500">
                <span>Example data only</span>
                <span className="text-slate-400 dark:text-slate-500">
                  Replace with real cluster payloads
                </span>
              </div>
            </header>

            {/* Example list of clusters */}
            <div className="space-y-3">
              {sampleClusters.map((cluster, idx) => (
                <div
                  key={cluster.label}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-400/60 bg-violet-500/10 text-[11px] text-violet-600 dark:bg-violet-500/15 dark:text-violet-100">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">
                          {cluster.label}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {cluster.size} products • cohesion {cluster.cohesion}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Similarity-driven
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">
                      Top signals:
                    </span>
                    {cluster.topSignals.map((sig) => (
                      <span
                        key={sig}
                        className="rounded-full border border-slate-200 bg-slate-100 px-2 py-[2px] dark:border-slate-700 dark:bg-slate-900"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Placeholder for JSON / table view */}
            <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                <span>Raw view placeholder</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  Later: JSON or table with cluster_id, product_id, similarity
                </span>
              </div>
              <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-700 dark:border-slate-900 dark:bg-slate-950/90 dark:text-slate-300">
{`[
  { "cluster_id": 12, "product_id": "SKU-00123", "similarity": 0.96 },
  { "cluster_id": 12, "product_id": "SKU-00987", "similarity": 0.93 },
  { "cluster_id": 47, "product_id": "SKU-00456", "similarity": 0.91 }
]`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
