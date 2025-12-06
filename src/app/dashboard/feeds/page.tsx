"use client";

/**
 * AvidiaFeeds module page
 *
 * AvidiaFeeds consolidates and normalizes product feeds from multiple sources
 * into a unified, ready-to-import feed compatible with your e-commerce
 * platforms and marketplaces.
 */

export default function FeedsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Ambient background: sky/emerald bias for feeds & automations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER / HERO */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-sky-500/45 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(56,189,248,0.4)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + description */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                  Commerce &amp; Automation · AvidiaFeeds
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-sky-200">Feeds pipeline</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    One{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-sky-200 to-emerald-200">
                      clean feed
                    </span>{" "}
                    for every channel you care about.
                  </h1>
                  <p className="text-sm text-slate-300">
                    AvidiaFeeds consolidates and normalizes supplier, distributor, and
                    marketplace feeds into a single, trusted view. From there, you can push
                    channel-ready feeds to Shopify, BigCommerce, marketplaces, and custom
                    destinations without reinventing mappings each time.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-sky-500/60 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span className="text-slate-200">
                      Normalize multiple supplier feeds into one canonical catalog.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/55 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-200">
                      Fill gaps with AvidiaExtract and AvidiaSEO when fields are missing.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700/70 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span className="text-slate-200">
                      Output channel-specific feeds without duplicating work.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + feed snapshot */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                        <span className="text-sm font-semibold text-sky-200">
                          Feed model in design · Connectors planned
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      Multi-source feeds
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AvidiaFeeds will live alongside Import / Export so you can go from
                    supplier feeds to channel-ready output without custom glue scripts.
                  </p>
                </div>

                {/* Static feed health snapshot */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Sample feed consolidation
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Sources</span>
                      <span className="text-slate-200 font-medium">3 suppliers</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Raw rows</span>
                      <span className="text-slate-200 font-medium">14,820</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Normalized SKUs</span>
                      <span className="text-emerald-300 font-medium">12,430</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-300">Ready for export</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-400/70 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                        11,972 rows
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    UI will surface feed health: coverage, deduped SKUs, missing fields
                    resolved from AvidiaExtract / SEO.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: two-column layout */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* LEFT: what it does / value */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Consolidated, normalized feeds from every source
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                AvidiaFeeds acts as the intake and harmonization layer for all of your
                product feeds. Supplier CSVs, distributor exports, marketplace feeds—
                everything gets normalized into a single schema that the rest of AvidiaTech
                understands.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Consolidates <span className="font-medium">supplier and distributor feeds</span>{" "}
                    into one canonical feed instead of siloed spreadsheets.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Detects <span className="font-medium">missing or mismatched fields</span> and fills
                    gaps using AvidiaExtract, AvidiaSpecs, and AvidiaSEO when possible.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Applies your <span className="font-medium">taxonomies and category mappings</span>{" "}
                    so every incoming source inherits your structure, not theirs.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Outputs <span className="font-medium">ready-to-import feeds</span> for Shopify,
                    BigCommerce, WooCommerce, and marketplaces without duplicating mapping logic.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Where AvidiaFeeds shines
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                    Multi-supplier catalogs
                  </div>
                  <p className="mt-1.5">
                    Harmonize overlapping feeds from multiple suppliers into one deduped,
                    normalized product set for MedicalEx or any other store.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                    Channel &amp; marketplace feeds
                  </div>
                  <p className="mt-1.5">
                    Maintain one central catalog inside AvidiaTech while producing feeds
                    tuned for marketplaces, comparison engines, and ad platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Planned workflow · how AvidiaFeeds will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Connect or upload feeds</div>
                    <p className="text-xs text-slate-400">
                      Upload CSVs, schedule SFTP drops, or connect to supplier APIs and
                      marketplaces as feed sources into AvidiaFeeds.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Normalize, dedupe, and enrich
                    </div>
                    <p className="text-xs text-slate-400">
                      Map fields into your master schema, dedupe overlapping SKUs, and fill
                      missing data using AvidiaExtract, Specs, and SEO outputs where possible.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Generate channel-specific feeds
                    </div>
                    <p className="text-xs text-slate-400">
                      Use prebuilt or custom feed profiles (Shopify, BigCommerce, Google
                      Shopping, marketplaces) and export or schedule recurring updates.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(56,189,248,0.55)] hover:bg-sky-400 disabled:opacity-70"
                  disabled
                >
                  Feeds workspace (coming soon)
                </button>
                <p className="text-xs text-slate-400">
                  The Feeds workspace will show source status, coverage, and per-channel
                  feed health so you always know what&apos;s safe to ship downstream.
                </p>
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                <li>
                  • <span className="font-medium text-slate-200">AvidiaExtract</span> — enrich
                  raw feeds with scraped specs, manuals, and images when suppliers omit them.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaSEO &amp; Describe</span>{" "}
                  — inject SEO-ready titles and descriptions into outbound feeds.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaImport</span> — share
                  mapping layers so feeds and direct imports stay aligned.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">Price &amp; Audit</span> — ensure
                  only priced, audited products make it into channel feeds.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500">
                Over time, AvidiaFeeds becomes your central hub for multi-source product data:
                one normalized feed in, many optimized feeds out.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
