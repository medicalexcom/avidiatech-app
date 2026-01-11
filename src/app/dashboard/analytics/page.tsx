"use client";

export default function AnalyticsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background: subtle cyan/amber grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-300/26 blur-3xl dark:bg-cyan-500/18" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-amber-300/22 blur-3xl dark:bg-amber-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 space-y-6 sm:px-6 lg:px-10 lg:py-8">
        {/* HEADER – compact Cluster-style */}
        <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              Workspace · Analytics
              <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-700 dark:text-slate-200">
                Overview &amp; reporting
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Workspace
              </p>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
                Analytics &amp; Reporting
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                High-level visibility into how your tenants, suppliers, and modules are
                performing across the AvidiaTech pipeline.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live data pipeline
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
              Snapshot view · More charts coming soon
            </span>
          </div>
        </header>

        {/* TOP SUMMARY STRIP */}
        <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly ingests</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              —
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              URLs, variants, docs and SEO calls across all modules.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
            <p className="text-xs text-slate-500 dark:text-slate-400">Top suppliers</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              —
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Ranked by successful ingests and active SKUs.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SEO &amp; Audit health
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              —
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Pass / warn / fail distribution across recent batches.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
            <p className="text-xs text-slate-500 dark:text-slate-400">Active users</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              —
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Team members who created, edited, or audited in the last 30 days.
            </p>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* LEFT: TEXTUAL BREAKDOWN */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pipeline overview
              </h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                Use this area to understand how content flows from ingest to store:
                which suppliers send the most volume, where SEO and Audit are catching
                issues, and how often your team interacts with the catalog.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li>
                  <span className="font-medium">Ingestion volumes:</span> monthly counts
                  of URLs, variants, docs, and SEO calls grouped by module and brand.
                </li>
                <li>
                  <span className="font-medium">Top suppliers &amp; categories:</span>{" "}
                  rank brands and categories by ingested volume and live SKUs.
                </li>
                <li>
                  <span className="font-medium">Audit &amp; SEO metrics:</span> pass /
                  warn / fail trends over time, broken out by module and batch.
                </li>
                <li>
                  <span className="font-medium">User activity:</span> see who is
                  ingesting, editing, and approving content across your workspaces.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Coming soon: charts &amp; exports
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                The full Analytics workspace will add time-series charts, filters for
                tenants and suppliers, and CSV/JSON exports so you can push metrics
                into your own BI tools.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <li>• Time-series charts for ingests, SEO, and audit scores.</li>
                <li>• Filters for brand, category, module, and tenant.</li>
                <li>• Downloadable exports for deeper analysis in external tools.</li>
              </ul>
            </div>
          </div>

          {/* RIGHT: PLACEHOLDER PANELS */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Supplier &amp; brand performance
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                This panel will surface your most important brands and suppliers by
                volume, SEO health, and audit score—so you know where to double down
                and where to fix upstream data.
              </p>
              <div className="mt-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-500">
                Brand / supplier ranking visualization (planned)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Team activity snapshot
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                A quick look at how your team interacts with the system—who is
                ingesting, reviewing, and approving content across modules.
              </p>
              <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-500">
                Activity list / heatmap (planned)
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
