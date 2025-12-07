"use client";

/**
 * AvidiaSpecs module page
 *
 * AvidiaSpecs normalizes and structures specification data across suppliers and
 * manufacturers. It converts messy spec tables into clean, queryable key–value structures.
 */

export default function SpecsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background gradients + subtle grid (light-first) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-300/26 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-300/24 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8 space-y-6">
        {/* Header / hero row – Cluster-style, light-first */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/60 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-5 shadow-[0_0_60px_rgba(34,211,238,0.28)] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-cyan-500/45 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(34,211,238,0.45)]">
            {/* subtle inner grid */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
              <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)]" />
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
              {/* Left: title + copy */}
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  Data Intelligence · AvidiaSpecs
                  <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-cyan-700 dark:text-cyan-200">
                    Specs engine in progress
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-semibold leading-snug text-slate-900 sm:text-2xl lg:text-[1.85rem] dark:text-slate-50">
                    Turn messy spec tables into{" "}
                    <span className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-sky-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-emerald-300 dark:to-sky-300">
                      clean, queryable data
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Normalize and structure spec tables from different manufacturers into
                    a single spec language for your catalog. AvidiaSpecs becomes the
                    “attributes brain” for filters, comparisons, feeds, and SEO — no more
                    guessing what “Overall Height” actually means.
                  </p>
                </div>

                {/* Hero chips */}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/95 border border-cyan-400/60 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-cyan-500/60 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>
                      Ingests HTML tables, PDFs, and vendor sheets into a unified spec
                      model.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/95 border border-emerald-400/60 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-emerald-500/60 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      Normalizes units, labels, and naming across brands and suppliers.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/95 border border-violet-400/60 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-violet-500/60 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span>
                      Exports to PIMs, search indexes, feeds, and storefront filters.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + mini spec pipeline */}
              <div className="mt-1 flex w-full max-w-xs flex-col gap-3 lg:mt-0 lg:max-w-sm">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950/90">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                        <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                          Design locked · Specs engine in progress
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Data Intelligence
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    AvidiaSpecs will become the backbone for structured attributes across
                    AvidiaExtract, AvidiaMatch, Variants, and SEO.
                  </p>

                  {/* Mini pipeline */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
                        Spec pipeline
                      </span>
                      <span className="">Drafted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-300">
                          1
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          Raw tables &amp; PDFs
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {">"}
                      </span>
                      <div className="flex flex-1 items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300">
                          2
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          Normalized specs
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {">"}
                      </span>
                      <div className="flex flex-1 items-center gap-1">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] text-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300">
                          3
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          Exports &amp; filters
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tiny spec model teaser */}
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Spec model sneak peek
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Height: 72 in
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Width: 36 in
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Voltage: 120 V
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      Material: Stainless steel
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">
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
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.28)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Structured specs from chaos
              </h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                AvidiaSpecs ingests spec tables, PDFs, and HTML blocks from manufacturers
                and distributors, then maps them into a normalized spec model tailored to
                your catalog. Units, labels, and naming all get aligned so filters and
                comparisons actually make sense.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
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

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Where Specs helps the most
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                    E-commerce filters
                  </div>
                  <p className="mt-1.5">
                    Power left-rail filters, comparison tables, and PDP spec sections with
                    consistent, normalized attributes instead of free-form text blobs.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
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
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Planned workflow · how AvidiaSpecs will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-cyan-600 dark:bg-slate-800 dark:text-cyan-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Ingest specs from sources
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Use AvidiaExtract or direct uploads to pull raw spec tables from
                      product pages, PDFs, vendor data sheets, or internal catalogs.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-cyan-600 dark:bg-slate-800 dark:text-cyan-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Normalize &amp; map fields
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      AvidiaSpecs maps labels, converts units, deduplicates attributes, and
                      aligns values with your master spec schema + naming system.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-cyan-600 dark:bg-slate-800 dark:text-cyan-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Export to where it matters
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A dedicated Specs workspace will let you preview parsed tables, approve
                  mappings, and export per-brand, per-schema, or per-segment views.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/95 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <span className="font-medium text-slate-800 dark:text-slate-200">AvidiaExtract</span>{" "}
                  — use existing scrape payloads as the raw spec source with minimal extra
                  work.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaDescribe &amp; SEO
                  </span>{" "}
                  — feed structured specs into feature bullets, comparison blocks, and PDP
                  layouts.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaMatch &amp; Variants
                  </span>{" "}
                  — leverage normalized specs to match, group, and compare similar products
                  more reliably across brands and suppliers.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
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
