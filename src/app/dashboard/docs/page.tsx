"use client";

/**
 * AvidiaDocs module page
 *
 * AvidiaDocs extracts structured information from technical manuals and PDF
 * documents. It synthesizes complex content into actionable product data that
 * can enrich specs, features, and SEO content.
 */

export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header / hero row */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-violet-300/60 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-5 shadow-[0_0_64px_rgba(129,140,248,0.25)] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-violet-500/45 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(167,139,250,0.45)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + copy */}
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(129,140,248,0.8)] dark:bg-violet-400 dark:shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
                  Data Intelligence · AvidiaDocs
                  <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-violet-700 dark:text-violet-200">
                    Manuals pipeline in progress
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-50">
                    Turn dense manuals into{" "}
                    <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-sky-300">
                      structured, reusable product data
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Transform technical manuals, IFUs, and PDF data sheets into clean specs,
                    features, warnings, and support content that flows into your catalog,
                    SEO, and automation workflows&mdash;without reading every page.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-violet-500/50 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                    <span>
                      Targets the &quot;hard mode&quot; of product data: manuals, IFUs, and
                      regulatory PDFs.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-emerald-500/50 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    <span>
                      Extracts specs, warnings, and tables into a structured data layer.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-sky-500/50 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                    <span>
                      Designed to plug into Specs, Extract, and SEO with zero copy-paste.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status card */}
              <div className="mt-1 w-full max-w-xs lg:mt-0 lg:max-w-sm">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950/90">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(129,140,248,0.8)] dark:bg-violet-400 dark:shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
                        <span className="text-sm font-semibold text-violet-700 dark:text-violet-200">
                          R&amp;D engine · Manuals pipeline in progress
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Data Intelligence
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    AvidiaDocs will specialize in extracting trusted, source-of-truth product
                    data directly from OEM manuals and regulatory PDFs.
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
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Structured data from manuals &amp; PDFs
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                AvidiaDocs focuses on the &quot;hard mode&quot; of product data: extracting
                accurate, structured information from technical manuals, IFUs, and regulatory
                PDFs. Instead of reading them one by one, you get clean data that plugs
                straight into your catalog and automation workflows.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span>
                    Extracts{" "}
                    <span className="font-medium">
                      specs, features, warnings, and tables
                    </span>{" "}
                    from PDF manuals and data sheets.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span>
                    Summarizes lengthy technical documents into{" "}
                    <span className="font-medium">digestible content</span> for product
                    pages, support docs, and internal teams.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span>
                    Normalizes extracted specs for easy mapping to{" "}
                    <span className="font-medium">product attributes and AvidiaSpecs schemas</span>
                    .
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span>
                    Integrates with{" "}
                    <span className="font-medium">Extract, Specs, and SEO</span> to enrich
                    product data end-to-end and keep content aligned with the source of
                    truth.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Ideal for regulated &amp; technical catalogs
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Medical &amp; clinical
                  </div>
                  <p className="mt-1.5">
                    Pull critical information from IFUs and device manuals&mdash;indications,
                    contraindications, warnings, and maintenance instructions&mdash;without
                    manual data entry.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Industrial &amp; technical
                  </div>
                  <p className="mt-1.5">
                    Extract specs, performance curves, and installation details from
                    engineering PDFs and OEM documentation into a searchable data layer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: planned workflow / pipeline */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Planned workflow · how AvidiaDocs will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-700 dark:bg-slate-800 dark:text-violet-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Upload or link manuals
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Attach PDFs directly, or let AvidiaExtract discover manuals and data
                      sheets from manufacturer pages as part of the ingest pipeline.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-700 dark:bg-slate-800 dark:text-violet-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Extract &amp; structure content
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      AvidiaDocs parses tables, headings, and paragraphs into
                      machine-readable fields that map to specs, features, warnings, and
                      compliance data.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-700 dark:bg-slate-800 dark:text-violet-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Sync into products &amp; SEO
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Enrich product records, Specs models, and AvidiaSEO prompts with
                      high-fidelity information extracted directly from the source
                      documentation, so your content is both rich and defensible.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-50 shadow-[0_12px_28px_rgba(167,139,250,0.4)] hover:bg-violet-400 disabled:opacity-70 dark:text-slate-950 dark:shadow-[0_12px_32px_rgba(167,139,250,0.55)]"
                  disabled
                >
                  Docs workspace (coming soon)
                </button>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  A dedicated Docs workspace will let you preview extracted content, approve
                  key fields, and push data into AvidiaSpecs and AvidiaSEO with a click.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <span className="font-medium text-slate-900 dark:text-slate-200">AvidiaExtract</span> — detect
                  and pull linked manuals automatically during URL ingests.
                </li>
                <li>
                  • <span className="font-medium text-slate-900 dark:text-slate-200">AvidiaSpecs</span> — map
                  structured spec fields from manuals into your normalized spec schema.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    AvidiaSEO &amp; Describe
                  </span>{" "}
                  — use verified technical content from manuals to generate accurate,
                  compliant descriptions and support content.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Long term, AvidiaDocs becomes your bridge between raw OEM documentation and
                the structured product graph that powers your storefronts, feeds, and
                knowledge base.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
