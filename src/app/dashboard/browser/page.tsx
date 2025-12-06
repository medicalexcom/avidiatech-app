"use client";

/**
 * AvidiaBrowser module page
 *
 * AvidiaBrowser is a browser / Chrome extension that lets power users
 * extract product data directly while they browse, then send it into
 * AvidiaTech or download it for quick use.
 */

export default function BrowserPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-300/28 blur-3xl dark:bg-violet-500/28" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* HEADER / HERO */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/45 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-5 shadow-[0_0_40px_rgba(167,139,250,0.35)] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(167,139,250,0.35)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + description */}
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
                  Developer Tools · AvidiaBrowser
                  <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-violet-500 dark:text-violet-200">
                    On-page capture extension
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-50">
                    Capture product data{" "}
                    <span className="bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent dark:from-violet-300 dark:via-sky-200 dark:to-emerald-200">
                      without leaving the page.
                    </span>
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    AvidiaBrowser is a browser extension for power users. While you browse
                    manufacturer sites, marketplaces, or competitor catalogs, you can grab
                    structured product data on the spot and send it straight into the
                    AvidiaTech pipeline—or export it as CSV/JSON when you just need a
                    quick capture.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/60 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-violet-500/60 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span>One-click on-page extraction from live product pages.</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/55 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-sky-500/55 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span>Send captures directly into AvidiaExtract and SEO.</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>Authenticated and rate-limited for safe team usage.</span>
                  </div>
                </div>
              </div>

              {/* Right: module status + "browser strip" */}
              <div className="mt-1 w-full max-w-xs space-y-3 lg:mt-0 lg:max-w-sm">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950/90">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-200">
                          UX drafted · Extension scaffold in planning
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Browser tool
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    AvidiaBrowser will ship as a Chrome-first extension, with compatibility
                    for Chromium-based browsers and future Safari / Firefox builds.
                  </p>
                </div>

                {/* Static "fake browser" preview */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-[0_18px_45px_rgba(148,163,184,0.4)] dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Manufacturer product page
                    </span>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                        AvidiaBrowser · Capture panel
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/50 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-600 dark:text-violet-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        Live
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                          Product
                        </div>
                        <p className="mt-0.5 truncate text-slate-500 dark:text-slate-400">
                          3M Littmann Stethoscope…
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                          Source
                        </div>
                        <p className="mt-0.5 truncate text-slate-500 dark:text-slate-400">
                          manufacturer.com/sku-123
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                          Fields
                        </div>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          Title, specs, images, docs
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-violet-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-50 shadow-sm hover:bg-violet-400 disabled:opacity-70 dark:text-slate-950"
                        disabled
                      >
                        Send to Avidia
                      </button>
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        disabled
                      >
                        Download JSON / CSV
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                    The real extension will show a compact capture card like this on any
                    product page you visit.
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
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                On-page extraction for power users
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Instead of copying, pasting, and cleaning data by hand, AvidiaBrowser
                lets you capture structured product payloads directly from the sites
                you&apos;re already browsing. It’s built for agencies, catalog owners,
                and operators who live inside tabs all day.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>
                    <span className="font-medium">On-page extraction:</span> click the extension
                    to extract product details—title, specs, images, manuals, and more—from
                    the current page and preview them instantly.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>
                    <span className="font-medium">Send to Avidia:</span> push captured products
                    directly into AvidiaExtract or a selected project with one click, keeping
                    them in the same normalized JSON as your ingest engine.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>
                    <span className="font-medium">Quick export mode:</span> download CSV/JSON
                    payloads locally when you just need a fast one-off capture outside of
                    the AvidiaTech pipeline.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>
                    <span className="font-medium">Secure &amp; rate-limited:</span> built-in
                    authentication and per-account rate limits keep captures tied to your
                    workspace and protect your API usage.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Who AvidiaBrowser is perfect for
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                    Agencies &amp; catalog managers
                  </div>
                  <p className="mt-1.5">
                    Research competitive assortments, new manufacturers, or replacement
                    products in the browser and send clean captures into Avidia for
                    structured follow-up—no spreadsheets required.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                    Founders &amp; operators
                  </div>
                  <p className="mt-1.5">
                    Validate suppliers, test new niches, or pull a small batch of products
                    into your Avidia workspace while you&apos;re still exploring ideas
                    from your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Planned workflow · how AvidiaBrowser will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-600 dark:bg-slate-800 dark:text-violet-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Install &amp; connect
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Install the Chrome extension, log in with your AvidiaTech account,
                      and pick the default workspace or tenant you want to send captures
                      into.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-600 dark:bg-slate-800 dark:text-violet-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Capture products while browsing
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      On any product page, open the extension pane, review the extracted
                      product payload, and either send it into AvidiaExtract or download it
                      as CSV/JSON.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-violet-600 dark:bg-slate-800 dark:text-violet-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Review in the dashboard &amp; continue flows
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Captured products appear in your AvidiaTech dashboard, ready for
                      Describe, SEO, Specs, Audit, Import, and pricing flows—just like
                      regular ingests.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-slate-50 shadow-[0_12px_32px_rgba(167,139,250,0.35)] hover:bg-violet-400 disabled:opacity-70 dark:text-slate-950 dark:shadow-[0_12px_32px_rgba(167,139,250,0.55)]"
                  disabled
                >
                  Browser extension (coming soon)
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You&apos;ll be able to connect AvidiaBrowser to specific workspaces,
                  brands, or projects and see captures land in real time.
                </p>
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaExtract
                  </span>{" "}
                  — treat browser captures as first-class ingest jobs so they can flow through the
                  same normalization and QA steps.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaDescribe &amp; SEO
                  </span>{" "}
                  — immediately spin up SEO-ready content on captured products without
                  additional setup.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaImport
                  </span>{" "}
                  — include browser-sourced products in your export profiles and store sync runs.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Avidia API
                  </span>{" "}
                  — advanced users can route extension captures into custom workflows via webhooks or
                  direct API endpoints.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Over time, AvidiaBrowser becomes your fastest way to turn &quot;I found this
                product online&quot; into a fully structured, ready-to-sell item inside
                AvidiaTech.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
