"use client";

/**
 * AvidiaImport module page
 *
 * AvidiaImport transforms Avidia’s structured product JSON into
 * platform-ready import files for Shopify, BigCommerce, WooCommerce and
 * other e-commerce systems. It will support both downloadable exports
 * and direct API pushes in later phases.
 */

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* Header / hero row */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-sky-500/45 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(56,189,248,0.45)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + copy */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                  Commerce &amp; Automation · AvidiaImport
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-sky-200">Export &amp; connector engine</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    Turn your unified Avidia JSON into{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300">
                      platform-perfect import files
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-300">
                    AvidiaImport sits at the end of the AvidiaTech pipeline. After Extract,
                    Describe, SEO, Specs, and Variants have done their work, Import reshapes that
                    single product model into Shopify, BigCommerce, WooCommerce, and feed-ready
                    payloads&mdash;without touching Excel.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-sky-500/60 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span className="text-slate-200">Export profiles tuned per platform schema.</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/55 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-200">
                      One normalized source model, many downstream destinations.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/55 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span className="text-slate-200">
                      Designed for future direct API pushes, not just CSVs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + export preview skeleton */}
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
                          Export profiles in design · Connectors planned
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      Export engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AvidiaImport will be your final hop from AvidiaTech&apos;s unified model into
                    stores, feeds, and marketplaces.
                  </p>
                </div>

                {/* Static export-profile skeleton */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Export profile preview
                  </p>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">Shopify · Full products</span>
                        <span className="text-slate-500">CSV · Title, variants, SEO, images</span>
                      </div>
                      <span className="rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">
                        Profile
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">BigCommerce · MedicalEx</span>
                        <span className="text-slate-500">JSON · Variants + custom fields</span>
                      </div>
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                        Draft
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-800 bg-slate-950 px-3 py-2">
                      <span className="text-slate-500">+ Add WooCommerce or custom feed profile</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Planned: choose a profile, preview mapped fields, then download or push via API.
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
                Platform-ready exports from your master JSON
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                AvidiaImport sits at the end of the AvidiaTech pipeline. After Extract, Describe,
                SEO, Specs, and Variants have done their work, Import converts that unified
                product model into the exact schema required by each commerce platform or feed
                target.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Platform exports:</span> generate Shopify CSV,
                    BigCommerce JSON, WooCommerce CSV, and additional formats as export profiles.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Simple export dropdown:</span> select the
                    desired destination (e.g., Shopify, BigCommerce) and download a
                    ready-to-upload file with one click.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Custom mapping layer:</span> automatically map
                    internal fields to each platform&apos;s schema; advanced mappings can be
                    adjusted in a UI instead of custom scripts.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Future direct integrations:</span> connect
                    directly to Shopify, BigCommerce, and WooCommerce APIs to push products
                    without leaving the dashboard.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Why Import / Export matters
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                    Less CSV pain
                  </div>
                  <p className="mt-1.5">
                    Instead of manually building CSV templates or patching exports in Excel, use
                    export profiles that always match the latest platform schema.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                    Single source of truth
                  </div>
                  <p className="mt-1.5">
                    Keep one normalized product model inside AvidiaTech and let Import reshape it
                    for each downstream destination: storefronts, feeds, and marketplaces.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: planned workflow / integration story */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Planned workflow · how AvidiaImport will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Pick a dataset</div>
                    <p className="text-xs text-slate-400">
                      Choose a slice of your catalog from AvidiaExtract / SEO (e.g., a brand,
                      collection, or recently ingested batch) as the export source.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Select export profile</div>
                    <p className="text-xs text-slate-400">
                      Pick an export profile like &quot;Shopify – Full Products&quot; or
                      &quot;BigCommerce – MedicalEx&quot;. Each profile knows exactly how to map
                      Avidia fields into platform fields.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      Download or push via API
                    </div>
                    <p className="text-xs text-slate-400">
                      Download a CSV/JSON file ready to upload, or (in later phases) push
                      directly to Shopify, BigCommerce, or WooCommerce with one click.
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
                  Export workspace (coming soon)
                </button>
                <p className="text-xs text-slate-400">
                  A dedicated Import / Export workspace will let you preview payloads, tweak
                  mappings, and schedule recurring exports for specific destinations.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                <li>
                  • <span className="font-medium text-slate-200">Shopify</span> — product &amp;
                  variant CSVs, plus future direct API sync.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">BigCommerce</span> — JSON &amp;
                  CSV exports tuned for MedicalEx plus other BC stores.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">WooCommerce</span> — CSV exports
                  aligned to Woo&apos;s core product schema.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">Feeds &amp; marketplaces</span> —
                  Google Shopping, marketplaces, and custom feeds based on the same export
                  engine.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500">
                Over time, AvidiaImport becomes the single connector layer between AvidiaTech and
                every storefront, feed, and marketplace you care about.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
