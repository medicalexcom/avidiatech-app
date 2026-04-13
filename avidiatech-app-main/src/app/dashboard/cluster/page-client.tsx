"use client";

import React, { useState } from "react";
import PageShell from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClusterResult {
  cluster_id: number;
  label: string;
  size: number;
  cohesion: number;
  topSignals: string[];
  members: { product_id: string; similarity: number; name: string }[];
}

// ─── Sample clusters (generated locally for immediate UX) ────────────────────
function generateClusters(threshold: number, minSize: number, fields: string[]): ClusterResult[] {
  const allClusters: ClusterResult[] = [
    {
      cluster_id: 12, label: "IV Poles & stands", size: 23, cohesion: 0.94 + (threshold - 0.9) * 0.02,
      topSignals: ["Brand", "Height range", "Base type"],
      members: [
        { product_id: "SKU-00123", similarity: 0.96, name: "Adjustable IV Pole, 5-leg base" },
        { product_id: "SKU-00987", similarity: 0.93, name: "Heavy-Duty IV Stand with casters" },
        { product_id: "SKU-00234", similarity: 0.91, name: "Compact IV Pole, wall-mount compatible" },
      ],
    },
    {
      cluster_id: 47, label: "Wheelchairs & transport", size: 18, cohesion: 0.91,
      topSignals: ["Seat width", "Frame material", "Footrest"],
      members: [
        { product_id: "SKU-00456", similarity: 0.92, name: "Standard Wheelchair, 18\" seat" },
        { product_id: "SKU-00789", similarity: 0.90, name: "Lightweight Transport Chair" },
        { product_id: "SKU-00321", similarity: 0.88, name: "Bariatric Wheelchair, 24\" seat" },
      ],
    },
    {
      cluster_id: 103, label: "Exam & procedure tables", size: 9, cohesion: 0.88,
      topSignals: ["Electric vs. manual", "Weight capacity", "Surface type"],
      members: [
        { product_id: "SKU-00654", similarity: 0.91, name: "Electric Exam Table with paper roll" },
        { product_id: "SKU-00765", similarity: 0.87, name: "Manual Procedure Table, vinyl top" },
      ],
    },
    {
      cluster_id: 58, label: "Blood pressure monitors", size: 14, cohesion: 0.96,
      topSignals: ["Cuff size", "Bluetooth", "Brand"],
      members: [
        { product_id: "SKU-00111", similarity: 0.97, name: "Omron BP Monitor, upper arm" },
        { product_id: "SKU-00222", similarity: 0.94, name: "Withings BPM Connect, WiFi" },
      ],
    },
    {
      cluster_id: 77, label: "Wound dressings", size: 31, cohesion: 0.87,
      topSignals: ["Dressing type", "Size", "Sterility"],
      members: [
        { product_id: "SKU-00333", similarity: 0.89, name: "Hydrocolloid Dressing 4x4" },
        { product_id: "SKU-00444", similarity: 0.87, name: "Foam Wound Dressing, non-adhesive" },
      ],
    },
  ];

  return allClusters
    .filter((c) => c.cohesion >= threshold && c.size >= minSize)
    .filter((c) => fields.length === 0 || c.topSignals.some((s) =>
      fields.some((f) => s.toLowerCase().includes(f.toLowerCase().split(" & ")[0].toLowerCase()))
    ) || true); // always include all for UX demo
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ClusterCard({
  cluster,
  expanded,
  onToggle,
  onAction,
}: {
  cluster: ClusterResult;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, id: number) => void;
}) {
  const cohPct = Math.round(cluster.cohesion * 100);
  const cohColor = cohPct >= 92 ? "#10b981" : cohPct >= 86 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80">
      {/* Header row */}
      <button
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-violet-400/60 bg-violet-500/10 text-[12px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-100">
            {cluster.cluster_id}
          </span>
          <div>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">{cluster.label}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {cluster.size} products · cohesion{" "}
              <span className="font-semibold" style={{ color: cohColor }}>{cluster.cohesion.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Similarity
          </span>
          <svg
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Top signals */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3.5 py-2 dark:border-slate-800">
        <span className="text-[12px] text-slate-400">Top signals:</span>
        {cluster.topSignals.map((sig) => (
          <span key={sig} className="rounded-full border border-slate-200 bg-slate-100 px-2 py-[2px] text-[12px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {sig}
          </span>
        ))}
      </div>

      {/* Expanded: member list + actions */}
      {expanded && (
        <div className="border-t border-slate-100 px-3.5 pb-3 pt-2.5 dark:border-slate-800">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.15em] text-slate-500">Members (sample)</p>
          <div className="space-y-1.5">
            {cluster.members.map((m) => (
              <div key={m.product_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{m.name}</span>
                  <span className="ml-2 text-slate-400">{m.product_id}</span>
                </div>
                <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">{m.similarity.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Cross-module actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onAction("match", cluster.cluster_id)}
              className="rounded-full border border-sky-400/60 bg-sky-500/10 px-2.5 py-1 text-[12px] font-medium text-sky-700 transition hover:bg-sky-500/15 dark:border-sky-400/60 dark:text-sky-200"
            >
              Send to AvidiaMatch
            </button>
            <button
              onClick={() => onAction("variants", cluster.cluster_id)}
              className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-700 transition hover:bg-emerald-500/15 dark:border-emerald-400/60 dark:text-emerald-200"
            >
              Build variants
            </button>
            <button
              onClick={() => onAction("csv", cluster.cluster_id)}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClusterPage() {
  // Form state
  const [scope, setScope] = useState("all");
  const [threshold, setThreshold] = useState(0.9);
  const [minSize, setMinSize] = useState(3);
  const [fields, setFields] = useState<string[]>(["Name & model", "Brand"]);

  // Results state
  const [clusters, setClusters] = useState<ClusterResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fieldOptions = ["Name & model", "Brand", "Specs / dimensions", "UPC / GTIN", "Category / taxonomy", "Keywords & tags"];

  function toggleField(f: string) {
    setFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  async function runClustering() {
    setRunning(true);
    setClusters(null);
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 1400));
    const results = generateClusters(threshold, minSize, fields);
    setClusters(results);
    setRunning(false);
  }

  function handleAction(action: string, id: number) {
    const msgs: Record<string, string> = {
      match: `Cluster #${id} queued in AvidiaMatch.`,
      variants: `Variant workspace opened for Cluster #${id}.`,
      csv: `Cluster #${id} CSV download started.`,
    };
    setToast(msgs[action] ?? "Done.");
    setTimeout(() => setToast(null), 3000);
  }

  const totalProducts = clusters?.reduce((s, c) => s + c.size, 0) ?? 0;
  const avgCohesion = clusters && clusters.length > 0
    ? (clusters.reduce((s, c) => s + c.cohesion, 0) / clusters.length).toFixed(2)
    : null;

  return (
    <PageShell glow="indigo">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="space-y-6">
        {/* HEADER */}
        <section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-[260px] flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/60 bg-white/90 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-violet-400/80 bg-slate-100 dark:bg-slate-900">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                  </span>
                  AvidiaCluster · Data intelligence
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-700 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Interactive demo
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-semibold leading-tight text-slate-900 lg:text-2xl dark:text-slate-50">
                  Cluster your catalog into{" "}
                  <span className="bg-gradient-to-r from-violet-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent dark:from-violet-300 dark:via-sky-300 dark:to-cyan-300">
                    clean, explainable product groups
                  </span>
                  .
                </h1>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  Configure clustering parameters below, run the algorithm, and explore the resulting product groups. Send clusters to AvidiaMatch or build variant families in one click.
                </p>
              </div>
            </div>

            {/* Stats card */}
            {clusters && (
              <div className="w-full lg:w-[340px]">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/95">
                  <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-slate-400">Run results</p>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex items-center justify-between rounded-xl border border-violet-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-violet-400" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Clusters found</span>
                      </div>
                      <span className="font-bold text-violet-600 dark:text-violet-300">{clusters.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Products clustered</span>
                      </div>
                      <span className="font-bold text-sky-600 dark:text-sky-300">{totalProducts.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-slate-50 px-3 py-2 dark:bg-slate-900/90">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Avg cohesion</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-300">{avgCohesion}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr,1.1fr] lg:gap-6">
          {/* LEFT: configuration */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
            <header>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Clustering setup</h2>
              <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
                Configure parameters and run. AvidiaCluster groups similar products using normalized attributes, UPCs, and title similarity.
              </p>
            </header>

            <form
              className="space-y-3 text-xs"
              onSubmit={(e) => { e.preventDefault(); runClustering(); }}
            >
              {/* Source scope */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-slate-800 dark:text-slate-200">Source scope</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="all">All ingested products (recommended)</option>
                  <option value="brand">Single brand only</option>
                  <option value="subset">Subset (filtered by tag, category, or import batch)</option>
                </select>
              </div>

              {/* Threshold + min size */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-slate-800 dark:text-slate-200">
                    Similarity threshold
                    <span className="ml-1 text-[12px] font-normal text-violet-600 dark:text-violet-300">{threshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range" min={0.7} max={0.99} step={0.01}
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-[12px] text-slate-500">
                    <span>Loose (0.7)</span><span>Strict (0.99)</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-slate-800 dark:text-slate-200">Minimum cluster size</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    value={minSize}
                    onChange={(e) => setMinSize(parseInt(e.target.value))}
                  >
                    <option value={2}>2 items</option>
                    <option value={3}>3 items</option>
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                  </select>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-slate-800 dark:text-slate-200">Fields to prioritize</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {fieldOptions.map((f) => (
                    <label
                      key={f}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition ${
                        fields.includes(f)
                          ? "border-violet-400/60 bg-violet-50 dark:border-violet-500/60 dark:bg-violet-500/10"
                          : "border-slate-200 bg-slate-50 hover:border-violet-400/40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/80 dark:hover:bg-slate-900/90"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fields.includes(f)}
                        onChange={() => toggleField(f)}
                        className="h-3 w-3 rounded border border-slate-400 text-violet-500 focus:ring-violet-500/40 dark:border-slate-500 dark:bg-slate-900"
                      />
                      <span className="text-[12px] text-slate-700 dark:text-slate-200">{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={running}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3.5 py-2 text-xs font-semibold text-slate-50 shadow-md shadow-violet-500/40 transition hover:-translate-y-[1px] hover:bg-violet-400 disabled:opacity-70 dark:text-slate-950"
                >
                  {running ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Clustering…
                    </>
                  ) : "Run clustering"}
                </button>
                <button
                  type="button"
                  onClick={() => { setScope("all"); setThreshold(0.9); setMinSize(3); setFields(["Name & model", "Brand"]); setClusters(null); }}
                  className="text-[12px] text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Reset defaults
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: cluster explorer */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Cluster explorer</h2>
                <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
                  {clusters
                    ? `${clusters.length} clusters found · click any cluster to expand members and actions`
                    : "Configure and run clustering to explore results here."}
                </p>
              </div>
            </header>

            {/* Loading state */}
            {running && (
              <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-500 dark:text-slate-400">
                <svg className="h-6 w-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Running AvidiaCluster…</span>
              </div>
            )}

            {/* Empty state */}
            {!running && !clusters && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <span className="text-3xl">🗂</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No clusters yet</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Configure parameters and click "Run clustering."</p>
              </div>
            )}

            {/* Results */}
            {!running && clusters && (
              <div className="space-y-3">
                {clusters.map((c) => (
                  <ClusterCard
                    key={c.cluster_id}
                    cluster={c}
                    expanded={expandedId === c.cluster_id}
                    onToggle={() => setExpandedId((prev) => prev === c.cluster_id ? null : c.cluster_id)}
                    onAction={handleAction}
                  />
                ))}

                {/* Raw JSON view */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="flex items-center justify-between text-[12px] text-slate-700 dark:text-slate-300">
                    <span>Raw cluster payload</span>
                    <button
                      className="text-[12px] text-violet-500 underline underline-offset-2 hover:text-violet-600"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(clusters, null, 2)], { type: "application/json" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "clusters.json";
                        a.click();
                      }}
                    >
                      Download JSON
                    </button>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[12px] text-slate-700 dark:border-slate-900 dark:bg-slate-950/90 dark:text-slate-300">
                    {JSON.stringify(clusters.map((c) => ({ cluster_id: c.cluster_id, label: c.label, size: c.size, cohesion: c.cohesion })), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
