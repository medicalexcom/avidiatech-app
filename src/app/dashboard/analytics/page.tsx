"use client";

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl text-slate-50">
            Analytics &amp; Reporting
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            High-level visibility into how your tenants, suppliers, and modules are
            performing across the AvidiaTech pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 border border-slate-700 text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live data pipeline
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 border border-slate-800 text-slate-400">
            Snapshot view · More charts coming soon
          </span>
        </div>
      </header>

      {/* TOP SUMMARY STRIP */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-xs text-slate-400">Monthly ingests</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500">
            URLs, variants, docs and SEO calls across all modules.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-xs text-slate-400">Top suppliers</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Ranked by successful ingests and active SKUs.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-xs text-slate-400">SEO &amp; Audit health</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Pass / warn / fail distribution across recent batches.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-xs text-slate-400">Active users</p>
          <p className="mt-1 text-xl font-semibold text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Team members who created, edited, or audited in the last 30 days.
          </p>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* LEFT: TEXTUAL BREAKDOWN */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Pipeline overview
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Use this area to understand how content flows from ingest to store:
              which suppliers send the most volume, where SEO and Audit are catching
              issues, and how often your team interacts with the catalog.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <span className="font-medium">Ingestion volumes:</span> monthly counts of
                URLs, variants, docs, and SEO calls grouped by module and brand.
              </li>
              <li>
                <span className="font-medium">Top suppliers &amp; categories:</span> rank
                brands and categories by ingested volume and live SKUs.
              </li>
              <li>
                <span className="font-medium">Audit &amp; SEO metrics:</span> pass / warn /
                fail trends over time, broken out by module and batch.
              </li>
              <li>
                <span className="font-medium">User activity:</span> see who is ingesting,
                editing, and approving content across your workspaces.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-100">
              Coming soon: charts &amp; exports
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              The full Analytics workspace will add time-series charts, filters for
              tenants and suppliers, and CSV/JSON exports so you can push metrics
              into your own BI tools.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
              <li>• Time-series charts for ingests, SEO, and audit scores.</li>
              <li>• Filters for brand, category, module, and tenant.</li>
              <li>• Downloadable exports for deeper analysis in external tools.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: PLACEHOLDER PANELS */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Supplier &amp; brand performance
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              This panel will surface your most important brands and suppliers by
              volume, SEO health, and audit score—so you know where to double down
              and where to fix upstream data.
            </p>
            <div className="mt-3 h-32 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-[11px] text-slate-500">
              Brand / supplier ranking visualization (planned)
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Team activity snapshot
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              A quick look at how your team interacts with the system—who is
              ingesting, reviewing, and approving content across modules.
            </p>
            <div className="mt-3 h-24 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-[11px] text-slate-500">
              Activity list / heatmap (planned)
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
