"use client";

/**
 * AvidiaSpecs module page
 *
 * AvidiaSpecs normalizes and structures specification data across suppliers and
 * manufacturers. It converts messy spec tables into clean, queryable key–value structures.
 */

export default function SpecsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            Data Intelligence · AvidiaSpecs
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaSpecs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Normalize and structure messy specification tables from different manufacturers
            into clean, consistent, machine-ready spec models that power search, filters,
            and rich SEO.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              <span className="text-sm font-semibold text-cyan-200">
                Design locked · Specs engine in progress
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout: overview + workflow */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        {/* Left column: what it does / value */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Structured specs from chaos
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaSpecs ingests spec tables, PDFs, and HTML blocks from manufacturers and
              distributors, then maps them into a normalized spec model tailored to your
              catalog. Units, labels, and naming all get aligned so filters and comparisons
              actually make sense.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Parses product specification tables into structured{" "}
                  <span className="font-medium">key–value pairs</span> you can query and export.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Normalizes units and measurements</span>{" "}
                  (mm vs in, lb vs kg) across suppliers and brands.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Maps synonymous spec names{" "}
                  <span className="font-medium">(“Overall Height” vs “Height (H)”)</span> into
                  your preferred schema.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Exports structured specs as <span className="font-medium">CSV, JSON, or feeds</span>{" "}
                  for PIMs, search indexes, and storefront filters.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Where Specs helps the most
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                  E-commerce filters
                </div>
                <p className="mt-1.5">
                  Power left-rail filters, comparison tables, and PDP spec sections with
                  consistent, normalized attributes instead of free-form text.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                  B2B &amp; distribution
                </div>
                <p className="mt-1.5">
                  Unify specs from multiple suppliers into a single house schema for quoting,
                  compliance, and engineering teams.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: planned workflow / integration story */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaSpecs will run
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Ingest specs from sources</div>
                  <p className="text-xs text-slate-400">
                    Use AvidiaExtract or direct uploads to pull raw spec tables from product
                    pages, PDFs, or vendor data sheets.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Normalize &amp; map fields</div>
                  <p className="text-xs text-slate-400">
                    AvidiaSpecs maps labels, converts units, and aligns values with your
                    master spec schema and naming conventions.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Export to where it matters</div>
                  <p className="text-xs text-slate-400">
                    Push structured specs into search indexes, feeds, PIMs, or your storefront
                    so filters and SEO stay in sync with reality.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.55)] hover:bg-cyan-400"
                disabled
              >
                Specs workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                A dedicated Specs workspace will let you preview parsed tables, approve
                mappings, and export per-brand or per-schema views.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract</span> — use
                existing scrape payloads as the raw spec source.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaDescribe &amp; SEO</span>{" "}
                — feed structured specs into feature bullets, comparison blocks, and PDP
                layouts.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaMatch &amp; Variants</span>{" "}
                — leverage normalized specs to match, group, and compare similar products
                more reliably.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
