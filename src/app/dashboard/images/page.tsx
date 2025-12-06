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
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* Header / hero row */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-300/70 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-[0_0_70px_rgba(16,185,129,0.28)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-emerald-500/45 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(16,185,129,0.45)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + copy */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  Commerce &amp; Automation · AvidiaImages
                  <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                  <span className="text-emerald-600 dark:text-emerald-200">
                    Gallery &amp; variant mapping engine
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    Turn noisy product image carousels into{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 dark:from-emerald-300 dark:via-teal-300 dark:to-sky-300">
                      clean, variant-aware galleries
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    AvidiaImages pulls images from manufacturer and marketplace pages, cleans
                    them up, annotates them with precise alt text, and maps each asset to the
                    right variant&mdash;so your storefronts and feeds always show the right
                    photo at the right time.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-emerald-300/70 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-emerald-500/60 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>De-duplicate and normalize all product imagery.</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-sky-300/70 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-sky-500/55 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span>
                      Generate SEO-safe, accessible alt text with your custom GPT logic.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-amber-200/70 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:border-amber-500/55 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>
                      Designed to sync downstream to MedicalEx and other commerce stacks.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + gallery preview skeleton */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 sm:px-5 sm:py-4 space-y-3 shadow-md shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                          Core pipeline designed · Gallery UI planned
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                      Commerce &amp; Automation
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    AvidiaImages will sit between Extract, SEO, and Variants as your image
                    brain: where raw URLs become curated, variant-aware galleries.
                  </p>
                </div>

                {/* Static gallery skeleton to hint future UI */}
                <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
                    Future gallery workspace
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white flex items-center justify-center text-[9px] text-slate-500 dark:border-slate-800 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 dark:text-slate-500"
                      >
                        {i === 0
                          ? "Main"
                          : i === 1
                          ? "Zoom"
                          : i === 2
                          ? "Context"
                          : "Img"}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                    Planned: drag-and-drop ordering, alt-text editing, and variant chip
                    assignments in one place.
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
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Clean, annotated images from messy source pages
              </h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                AvidiaImages works alongside AvidiaExtract to pull image assets from
                manufacturer URLs, normalize them, and prepare them for your storefronts and
                marketplaces&mdash;with consistent alt text and variant-aware mapping.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">
                      Image extraction &amp; cleaning:
                    </span>{" "}
                    harvest all relevant product photos from the URL, filter out duplicates
                    and low-resolution shots, and keep only usable assets.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">AI-generated alt text:</span>{" "}
                    automatically generate descriptive alt tags based on product names, key
                    specs, and SEO context while staying compliant with your copy rules.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Variant-image mapping:</span>{" "}
                    assign images to variant options (color, size, configuration) so the
                    right photo shows for each variant in your store and feeds.
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Why images matter in your pipeline
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    Conversion &amp; UX
                  </div>
                  <p className="mt-1.5">
                    Clean, consistent images with correct alt text improve PDP clarity,
                    accessibility, and trust for high-consideration products like medical
                    devices and equipment.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    SEO &amp; feeds
                  </div>
                  <p className="mt-1.5">
                    Structured image data and alt tags feed directly into search engines and
                    marketplace feeds to improve discovery and listing quality scores.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: planned workflow / integration story */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Planned workflow · how AvidiaImages will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Ingest from URLs
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      AvidiaExtract pulls image URLs from manufacturer pages, including
                      thumbnails, zooms, and contextual graphics tied to each product.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Clean &amp; annotate
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Filter duplicates and low-quality images, then generate structured alt
                      text and optional captions aligned with AvidiaSEO copy and your brand
                      rules.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Map to variants &amp; export
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Attach images to specific variants (e.g., color or kit) and export
                      the final image set to your commerce platform or feed format so PDPs
                      and ads stay in sync.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-50 shadow-[0_12px_32px_rgba(16,185,129,0.55)] hover:bg-emerald-400 disabled:opacity-70 dark:text-slate-950"
                  disabled
                >
                  Image workspace (coming soon)
                </button>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  A dedicated Images workspace will let you visually inspect, reorder, and fix
                  images before syncing them back to MedicalEx or other connected stores.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaExtract
                  </span>{" "}
                  — primary source for raw image URLs from manufacturer product pages.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaSEO &amp; Describe
                  </span>{" "}
                  — reuse product and SEO copy to generate relevant, compliant alt text.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaVariants
                  </span>{" "}
                  — map specific images to variant options so PDPs and feeds stay consistent.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Long term, AvidiaImages becomes your single source of truth for curated,
                accessible imagery across every storefront, marketplace, and feed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
