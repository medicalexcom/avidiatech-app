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
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
            Commerce &amp; Automation · AvidiaImport
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            Import / Export
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Convert Avidia’s cleaned product data into platform-ready files for Shopify,
            BigCommerce, WooCommerce, and more. Start with simple CSV/JSON exports, then
            grow into direct API pushes as your stack matures.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
              <span className="text-sm font-semibold text-sky-200">
                Export profiles in design · Connectors planned
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
              Platform-ready exports from your master JSON
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaImport sits at the end of the AvidiaTech pipeline. After Extract, Describe,
              SEO, and Specs have done their work, Import converts that unified product model
              into the exact schema required by each commerce platform or feed target.
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
                  <span className="font-medium">Simple export dropdown:</span> select the desired
                  destination (e.g., Shopify, BigCommerce) and download a ready-to-upload file
                  with one click.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Custom mapping layer:</span> automatically map
                  internal fields to each platform’s schema; advanced mappings can be adjusted
                  in a UI instead of custom scripts.
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Why Import / Export matters
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                  Less CSV pain
                </div>
                <p className="mt-1.5">
                  Instead of manually building CSV templates or patching exports in Excel,
                  use export profiles that always match the latest platform schema.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
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
                    Pick an export profile like &quot;Shopify - Full Products&quot; or
                    &quot;BigCommerce - MedicalEx&quot;. Each profile knows exactly how to map
                    Avidia fields into platform fields.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-sky-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Download or push via API</div>
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
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(56,189,248,0.55)] hover:bg-sky-400"
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

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">Shopify</span> — product &
                variant CSVs, plus future direct API sync.
              </li>
              <li>
                • <span className="font-medium text-slate-200">BigCommerce</span> — JSON &amp;
                CSV exports tuned for MedicalEx plus other BC stores.
              </li>
              <li>
                • <span className="font-medium text-slate-200">WooCommerce</span> — CSV exports
                aligned to Woo’s core product schema.
              </li>
              <li>
                • <span className="font-medium text-slate-200">Feeds &amp; marketplaces</span> —
                Google Shopping, marketplaces, and custom feeds based on the same export engine.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
