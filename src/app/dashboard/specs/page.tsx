"use client";

/**
 * AvidiaSpecs module page
 *
 * AvidiaSpecs normalizes and structures specification data across suppliers and
 * manufacturers. It converts messy spec tables into clean, queryable key–value structures.
 */

export default function SpecsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/18 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* Header / hero row */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/45 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(34,211,238,0.45)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            {/* subtle inner grid */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
              <div className="h-full w-full bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
              {/* Left: title + copy */}
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  Data Intelligence · AvidiaSpecs
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-cyan-200">Specs engine in progress</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-[1.9rem] font-semibold text-slate-50 leading-snug">
                    Turn messy spec tables into{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-emerald-300 to-sky-300">
                      clean, queryable data
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-300">
                    Normalize and structure spec tables from different manufacturers into
                    a single spec language for your catalog. AvidiaSpecs becomes the
                    “attributes brain” for filters, comparisons, feeds, and SEO — no more
                    guessing what “Overall Height” actually means.
                  </p>
                </div>

                {/* Hero chips */}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-200">
                      Ingests HTML tables, PDFs, and vendor sheets into a unified spec model.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-200">
                      Normalizes units, labels, and naming across brands and suppliers.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-violet-500/50 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-slate-200">
                      Exports to PIMs, search indexes, feeds, and storefront filters.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + mini spec pipeline */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 flex flex-col gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                        <span className="text-xs font-semibold text-cyan-200">
                          Design locked · Specs engine in progress
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      Data Intelligence
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AvidiaSpecs will become the backbone for structured attributes across
                    AvidiaExtract, AvidiaMatch, Variants, and SEO.
                  </p>

                  {/* Mini pipeline */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span className="font-semibold text-slate-100 uppercase tracking-[0.18em]">
                        Spec pipeline
                      </span>
                      <span className="text-slate-500">Drafted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[10px] text-cyan-300">
                          1
                        </span>
                        <span className="text-[11px] text-slate-300">
                          Raw tables &amp; PDFs
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{">"}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[10px] text-emerald-300">
                          2
                        </span>
                        <span className="text-[11px] text-slate-300">
                          Normalized specs
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{">"}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[10px] text-violet-300">
                          3
                        </span>
                        <span className="text-[11px] text-slate-300">
                          Exports &amp; filters
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tiny spec model teaser */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Spec model sneak peek
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Height: 72 in
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Width: 36 in
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Voltage: 120 V
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      Material: Stainless steel
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Real engine will let you approve, override, and export entire spec
                    sets per product, brand, or category.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-column layout: overview + workflow */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* Left column: what it does / value */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Structured specs from chaos
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                AvidiaSpecs ingests spec tables, PDFs, and HTML blocks from manufacturers
                and distributors, then maps them into a normalized spec model tailored to
                your catalog. Units, labels, and naming all get aligned so filters and
                comparisons actually make sense.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Parses product specification tables into structured{" "}
                    <span className="font-medium">key–value pairs</span> you can query,
                    filter, and export.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Normalizes units and measurements</span>{" "}
                    (mm vs in, lb vs kg, °C vs °F) across suppliers and brands, so math
                    actually works.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Maps synonymous spec names{" "}
                    <span className="font-medium">(“Overall Height” vs “Height (H)”)</span>{" "}
                    into your preferred schema and naming conventions.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Exports structured specs as{" "}
                    <span className="font-medium">CSV, JSON, or feeds</span> for PIMs,
                    search indexes, comparison tables, and storefront filters.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Where Specs helps the most
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                    E-commerce filters
                  </div>
                  <p className="mt-1.5">
                    Power left-rail filters, comparison tables, and PDP spec sections with
                    consistent, normalized attributes instead of free-form text blobs.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                    B2B &amp; distribution
                  </div>
                  <p className="mt-1.5">
                    Unify specs from multiple suppliers into a single house schema for
                    quoting, compliance, engineering, and regulatory teams.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: planned workflow / integration story */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Planned workflow · how AvidiaSpecs will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Ingest specs from sources
                    </div>
                    <p className="text-xs text-slate-400">
                      Use AvidiaExtract or direct uploads to pull raw spec tables from
                      product pages, PDFs, vendor data sheets, or internal catalogs.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Normalize &amp; map fields
                    </div>
                    <p className="text-xs text-slate-400">
                      AvidiaSpecs maps labels, converts units, deduplicates attributes, and
                      aligns values with your master spec schema + naming system.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Export to where it matters
                    </div>
                    <p className="text-xs text-slate-400">
                      Push structured specs into search indexes, feeds, PIMs, BI tools, or
                      your storefront so filters, SEO, and analytics stay in sync with
                      reality.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.55)] hover:bg-cyan-400 disabled:opacity-70"
                  disabled
                >
                  Specs workspace (coming soon)
                </button>
                <p className="text-xs text-slate-400">
                  A dedicated Specs workspace will let you preview parsed tables, approve
                  mappings, and export per-brand, per-schema, or per-segment views.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                <li>
                  • <span className="font-medium text-slate-200">AvidiaExtract</span> — use
                  existing scrape payloads as the raw spec source with minimal extra work.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaDescribe &amp; SEO</span>{" "}
                  — feed structured specs into feature bullets, comparison blocks, and PDP
                  layouts.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-200">
                    AvidiaMatch &amp; Variants
                  </span>{" "}
                  — leverage normalized specs to match, group, and compare similar products
                  more reliably across brands and suppliers.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500">
                Over time, AvidiaSpecs becomes the central spec warehouse for your product
                graph, so you never have to rebuild attribute logic in spreadsheets again.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
