"use client";

export default function VisualizePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Ambient background / grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-32 right-[-8rem] h-72 w-72 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.96)_45%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace tool
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl text-slate-900 dark:text-slate-50">
            Visualize
          </h1>
          <p className="max-w-2xl text-sm text-slate-700 dark:text-slate-300">
            Bring your product data to life with interactive dashboards, drill-downs,
            and saved views that sit on top of the AvidiaTech pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
            Chart canvas
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
            Early design · Data wiring to follow
          </span>
        </div>
      </header>

      {/* TOP SUMMARY STRIP */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Dashboards</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Saved layouts combining charts, tables, and KPIs.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active filters</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Brand, category, and supplier filters applied across views.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tracked KPIs</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Coverage, quality, enrichment, and pricing indicators.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">Collaboration</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">—</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Shared dashboards and comments across your team.
          </p>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* LEFT: MAIN CANVAS + EXPLANATION */}
        <div className="space-y-4">
          {/* Chart canvas placeholder */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-md shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Interactive dashboard canvas
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 border border-slate-200 text-[11px] text-slate-500 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-400">
                Layout builder (planned)
              </span>
            </div>
            <div className="h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 flex items-center justify-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-500">
              Charts, tables, and KPIs will render here based on your selected dashboard.
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              You&apos;ll be able to assemble dashboards from prebuilt blocks: ingestion
              trends, SEO &amp; audit health, pricing and margin tiles, feed status, and more.
              Filters will sync across all visualizations in the layout.
            </p>
          </div>

          {/* Descriptive card */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              What Visualize is built to answer
            </h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Visualize sits on top of Extract, Describe, Match, Validate, SEO, and Import
              to show how your catalog is evolving—not just what it looks like today.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>
                <span className="font-medium">Custom dashboards:</span> combine charts,
                tables, and KPIs to monitor coverage, data quality, and enrichment progress.
              </li>
              <li>
                <span className="font-medium">Drill-downs:</span> move from global views
                into specific categories, suppliers, or attributes in a few clicks.
              </li>
              <li>
                <span className="font-medium">Trend analysis:</span> uncover seasonality,
                pricing movements, and catalog growth over time.
              </li>
              <li>
                <span className="font-medium">Geographies &amp; regions:</span> map
                distribution or inventory patterns via heatmaps and regional breakdowns.
              </li>
              <li>
                <span className="font-medium">Collaboration:</span> share dashboards,
                leave annotations, and keep everyone aligned on the same numbers.
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT: SAVED VIEWS / COMING SOON */}
        <div className="space-y-4">
          {/* Saved views */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Saved views &amp; templates
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Start from curated templates, then customize and save your own dashboards
              per team, tenant, or initiative.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Catalog coverage &amp; data quality
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Track ingested SKUs, missing fields, and enrichment progress
                  across brands and categories.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  SEO &amp; audit health
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Follow audit pass / warn / fail trends and SEO score movements over time.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Pricing &amp; margin signals
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Connect to AvidiaPrice and Monitor to keep an eye on margin drift and
                  pricing moves.
                </p>
              </div>
            </div>
          </div>

          {/* Coming soon / wiring note */}
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Coming soon: live data wiring
            </h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              As Visualize matures, it will pull directly from the same tables and APIs
              that power Analytics, Monitor, and Feeds—so every chart reflects the
              current state of your AvidiaTech workspace.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>• Real-time refresh for key KPIs and warning tiles.</li>
              <li>• Cross-module filters shared with Analytics and Monitor.</li>
              <li>• Export to image / PDF / CSV for sharing and reporting.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
