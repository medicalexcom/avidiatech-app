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
      <main className="min-h-[60vh] flex items-center justify-center bg-slate-950">
        <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-8 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-slate-50">AvidiaMatch</h1>
            <span className="inline-flex items-center rounded-full border border-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-300 bg-slate-900">
              Feature disabled
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Matching is not enabled for this workspace yet. If you&apos;re an owner or admin,
            you can toggle <span className="font-mono text-xs">FEATURE_MATCH</span> or{" "}
            <span className="font-mono text-xs">NEXT_PUBLIC_FEATURE_MATCH</span> in your
            environment to activate this module.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Data Intelligence · AvidiaMatch
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaMatch
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Upload competitor or marketplace data and instantly match it against your source
            products. Filter, review, and export high-confidence matches for your catalog.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              <span className="text-sm font-semibold text-emerald-300">
                Live & active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main content grid */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Left column: ingest + results */}
        <div className="space-y-4">
          {/* Upload / paste panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  1 · Upload or paste data
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Paste rows from a marketplace export or upload a CSV to start a match job.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <UploadPastePanel />
            </div>
          </div>

          {/* Filters + bulk actions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  2 · Refine matches
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Filter by confidence, brand, or SKU and push approved matches into your
                  workflow.
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-slate-200">3 · Review results</h2>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-400">
                Live match grid
              </span>
            </div>
            <div className="mt-1">
              <ResultsTable />
            </div>
          </div>
        </div>

        {/* Right column: job progress / status */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Match queue
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Track running and completed jobs, and drill into match diagnostics.
                </p>
              </div>
            </div>
            <JobProgress />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tips for better matching
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>• Include manufacturer part numbers in your source sheet.</li>
              <li>• Keep one row per product variant where possible.</li>
              <li>• Use consistent brand names between sources.</li>
              <li>• Re-run jobs after updating your master catalog in AvidiaExtract.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
