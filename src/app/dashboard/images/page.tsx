"use client";

/**
 * AvidiaImages module page
 *
 * AvidiaImages extracts product images from a URL, cleans and annotates them
 * with descriptive alt text, and maps them to variant options when possible.
 * Future iterations will include a fully interactive image gallery and editing tools.
 */

export default function ImagesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            Commerce &amp; Automation · AvidiaImages
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaImages
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Extract, clean, and annotate product images from manufacturer and marketplace
            pages. AvidiaImages ensures you have high-quality visuals with correct
            alt text and variant mapping, ready for storefronts and feeds.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
              <span className="text-sm font-semibold text-emerald-200">
                Core pipeline designed · Gallery UI planned
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
              Clean, annotated images from messy source pages
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaImages works alongside AvidiaExtract to pull image assets from
              manufacturer URLs, normalize them, and prepare them for your storefront
              and marketplaces—with consistent alt text and variant-aware mapping.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Image extraction &amp; cleaning:</span>{" "}
                  harvest all relevant product photos from the URL, filter out duplicates
                  and low-resolution shots, and keep only usable assets.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">AI-generated alt text:</span>{" "}
                  automatically generate descriptive alt tags based on product names,
                  key specs, and SEO context.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Variant-image mapping:</span>{" "}
                  assign images to variant options (color, size, configuration) so the
                  right photo shows for each variant in your store.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Future image gallery UI:</span>{" "}
                  review, reorder, and edit images in a gallery with thumbnails,
                  drag-and-drop ordering, and inline alt-text editing.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Why images matter in your pipeline
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Conversion &amp; UX
                </div>
                <p className="mt-1.5">
                  Clean, consistent images with correct alt text improve PDP clarity,
                  accessibility, and trust for high-consideration products like medical
                  devices and equipment.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  SEO &amp; feeds
                </div>
                <p className="mt-1.5">
                  Structured image data and alt tags feed directly into search engines
                  and marketplace feeds to improve discovery and listing quality scores.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: planned workflow / integration story */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaImages will run
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Ingest from URLs</div>
                  <p className="text-xs text-slate-400">
                    AvidiaExtract pulls image URLs from manufacturer pages, including
                    thumbnails, zooms, and contextual graphics tied to each product.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Clean &amp; annotate</div>
                  <p className="text-xs text-slate-400">
                    Filter duplicates and low-quality images, then generate structured
                    alt text and optional captions aligned with AvidiaSEO copy.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Map to variants &amp; export</div>
                  <p className="text-xs text-slate-400">
                    Attach images to specific variants (e.g., color) and export the
                    final image set to your commerce platform or feed format.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(16,185,129,0.55)] hover:bg-emerald-400"
                disabled
              >
                Image workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                A dedicated Images workspace will let you visually inspect, reorder, and fix
                images before syncing them back to MedicalEx or other connected stores.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract</span> — primary
                source for raw image URLs from manufacturer product pages.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaSEO &amp; Describe</span>{" "}
                — reuse product and SEO copy to generate relevant, compliant alt text.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaVariants</span> — map
                specific images to variant options so PDPs and feeds stay consistent.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
