"use client";

import React from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

export default function MatchPage() {
  const featureEnabled =
    process.env.NEXT_PUBLIC_FEATURE_MATCH === "true" ||
    process.env.FEATURE_MATCH === "true";

  if (!featureEnabled) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
        {/* Background gradients + subtle grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
          </div>
        </div>

        <div className="relative flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-lg w-full rounded-3xl border border-slate-800 bg-slate-900/90 px-6 py-7 shadow-[0_22px_80px_rgba(15,23,42,0.95)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-500" />
                  Data Intelligence · AvidiaMatch
                </div>
                <h1 className="mt-3 text-xl font-semibold text-slate-50">
                  AvidiaMatch is disabled for this workspace
                </h1>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 bg-slate-950/80">
                Feature disabled
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Matching is not enabled for this workspace yet. If you&apos;re an owner or
              admin, you can toggle{" "}
              <span className="font-mono text-[11px] text-emerald-300">
                FEATURE_MATCH
              </span>{" "}
              or{" "}
              <span className="font-mono text-[11px] text-emerald-300">
                NEXT_PUBLIC_FEATURE_MATCH
              </span>{" "}
              in your environment to activate this module.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Once enabled, AvidiaMatch will appear as a full module alongside Extract,
              Describe, SEO, and the rest of your AvidiaTech stack.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-cyan-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header / hero row */}
        <section className="mb-7">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(16,185,129,0.45)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + copy */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  Data Intelligence · AvidiaMatch
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-emerald-200">Live</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    Match competitor and marketplace listings to{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300">
                      your source catalog
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-300">
                    Upload competitor feeds or marketplace exports and AvidiaMatch will
                    align them to your ingested products from AvidiaExtract. Review,
                    refine, and export high-confidence matches into pricing, feeds, and
                    automation flows.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-200">
                      Uses normalized data from AvidiaExtract as the source of truth.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-200">
                      Scored matches with filters for brand, MPN, GTIN, and title.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-violet-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-slate-200">
                      Export approved matches into Price, Feeds, or your own pipelines.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status card */}
              <div className="w-full max-w-xs lg:max-w-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                        <span className="text-sm font-semibold text-emerald-300">
                          Live &amp; active
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      Tenant-aware
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Later, this card can show how many match jobs ran this week, average
                    confidence, and how many rows are waiting for approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content grid */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* Left column: ingest + results */}
          <div className="space-y-4">
            {/* Upload / paste panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    1 · Upload or paste data
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Paste rows from a marketplace export or upload a CSV to start a match
                    job. AvidiaMatch will align them to your AvidiaExtract catalog.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                  Source: external feeds
                </span>
              </div>
              <div className="mt-3">
                <UploadPastePanel />
              </div>
            </div>

            {/* Filters + bulk actions */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    2 · Refine matches
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Filter by confidence, brand, or SKU and push approved matches into your
                    workflow. Use bulk actions to accept, reject, or send to Price / Feeds.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <MatchFilters />
                </div>
                <div className="w-full md:w-[260px]">
                  <BulkActions />
                </div>
              </div>
            </div>

            {/* Results table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold text-slate-200">
                  3 · Review results
                </h2>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Live match grid
                </span>
              </div>
              <p className="px-1 text-[11px] text-slate-400 mb-2">
                Inspect row-level matches, override scores when needed, and mark pairs as
                approved or rejected. In production, this grid should be fully sortable and
                exportable.
              </p>
              <div className="mt-1">
                <ResultsTable />
              </div>
            </div>
          </div>

          {/* Right column: job progress / status */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Match queue
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Track running and completed jobs, and drill into match diagnostics or
                    re-run with tweaked thresholds.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                  Powered by ingest IDs
                </span>
              </div>
              <JobProgress />
            </div>

            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Tips for better matching
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                <li>• Include manufacturer part numbers in your source sheet.</li>
                <li>• Keep one row per product variant where possible.</li>
                <li>• Use consistent brand names between sources and master catalog.</li>
                <li>• Re-run jobs after updating your master catalog in AvidiaExtract.</li>
                <li>
                  • Use higher confidence thresholds for pricing, lower for discovery and
                  QA.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500">
                Later, this panel can surface per-tenant heuristics: most common reasons
                for low confidence, brands with high mismatch rates, and recommended
                improvements to your source data.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
