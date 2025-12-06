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
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
            Data Intelligence · AvidiaDocs
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaDocs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Turn dense technical manuals, IFUs, and PDF data sheets into structured,
            reusable product data&mdash;specs, features, warnings, and more that can
            flow into your catalog, SEO, and support content.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
              <span className="text-sm font-semibold text-violet-200">
                R&amp;D engine · Manuals pipeline in progress
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
              Structured data from manuals &amp; PDFs
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaDocs focuses on the &quot;hard mode&quot; of product data: extracting accurate,
              structured information from technical manuals, IFUs, and regulatory PDFs. Instead
              of reading them one by one, you get clean data that plugs straight into your
              catalog and automation workflows.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Extracts <span className="font-medium">specs, features, warnings, and tables</span> from PDF manuals and data sheets.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Summarizes lengthy technical documents into{" "}
                  <span className="font-medium">digestible content</span> for product pages and support docs.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Normalizes extracted specs for easy mapping to{" "}
                  <span className="font-medium">product attributes and AvidiaSpecs schemas</span>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Integrates with <span className="font-medium">Extract, Specs, and SEO</span> to enrich product data end-to-end.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Ideal for regulated &amp; technical catalogs
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                  Medical &amp; clinical
                </div>
                <p className="mt-1.5">
                  Pull critical information from IFUs and device manuals&mdash;indications,
                  contraindications, warnings, and maintenance instructions&mdash;without manual
                  data entry.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                  Industrial &amp; technical
                </div>
                <p className="mt-1.5">
                  Extract specs, performance curves, and installation details from engineering
                  PDFs and OEM documentation into a searchable data layer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: planned workflow / pipeline */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaDocs will run
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-violet-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Upload or link manuals</div>
                  <p className="text-xs text-slate-400">
                    Attach PDFs directly, or let AvidiaExtract discover manuals and data sheets
                    from manufacturer pages as part of the ingest pipeline.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-violet-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Extract &amp; structure content</div>
                  <p className="text-xs text-slate-400">
                    AvidiaDocs parses structured tables, headings, and paragraphs into
                    machine-readable fields that map to specs, features, and compliance data.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-violet-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Sync into products &amp; SEO</div>
                  <p className="text-xs text-slate-400">
                    Enrich product records, Specs models, and AvidiaSEO prompts with high-fidelity
                    information extracted directly from the source documentation.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(167,139,250,0.55)] hover:bg-violet-400"
                disabled
              >
                Docs workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                A dedicated Docs workspace will let you preview extracted content, approve key
                fields, and push data into AvidiaSpecs and AvidiaSEO with a click.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract</span> — detect and
                pull linked manuals automatically during URL ingests.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaSpecs</span> — map structured
                spec fields from manuals into your normalized spec schema.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaSEO &amp; Describe</span> —
                use verified technical content from manuals to generate accurate, compliant
                descriptions.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
