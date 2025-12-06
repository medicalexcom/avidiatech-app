'use client';

export default function VersioningPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background / grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/25" />
        <div className="absolute -bottom-32 right-[-8rem] h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.95)_45%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspace history
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl text-slate-900 dark:text-slate-50">
              Versioning &amp; History
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Track how your product data evolves over time. Versioning keeps a safety net
              behind every change so you can compare, audit, and roll back when something
              isn&apos;t right.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Version tracking planned
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 border border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
              UI for diff views &amp; rollback in design
            </span>
          </div>
        </header>

        {/* BODY GRID */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* LEFT: CONCEPT + CAPABILITIES */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                A safety net for every important field
              </h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                Versioning will keep snapshots of critical product fields—specs, enriched
                descriptions, pricing inputs, and SEO blocks—whenever something changes.
                That history gives you confidence to experiment without risking data loss.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    <span className="font-medium">Automatic versioning</span> for product
                    specs, descriptions, SEO fields, and other key attributes whenever a
                    job or user updates them.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    <span className="font-medium">Chronological timelines</span> per SKU or
                    batch so you can see a clear story of what changed and when.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    <span className="font-medium">Side-by-side diffs</span> to highlight
                    exactly which fields were added, removed, or edited between versions.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    <span className="font-medium">One-click restore</span> to roll back to a
                    previous version when something goes wrong or a sync overwrites data.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Where Versioning &amp; History is most useful
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    Aggressive automation
                  </p>
                  <p className="mt-1.5">
                    When Extract, SEO, Audit, and Import are all updating products, history
                    lets you confidently auto-heal while still having a known safe point to
                    return to.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    Multi-user teams
                  </p>
                  <p className="mt-1.5">
                    See who changed what and when. Use the timeline as a lightweight audit
                    log for content, pricing inputs, and critical catalog fields.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: SNAPSHOT / COMING UI */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Planned Versioning workspace
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                This area will become an interactive timeline and diff viewer inside the
                dashboard.
              </p>

              {/* Static mock timeline */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] dark:border-slate-800 dark:bg-slate-950/80">
                <p className="mb-2 font-medium text-slate-900 dark:text-slate-200">
                  Example history · SKU MEDX-1234
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          v5 · SEO title updated
                        </span>
                        <span className="text-slate-500">
                          Today · 2:14 PM · by Regina
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Page title length trimmed to fit policy. Internal links updated.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          v4 · Description auto-healed
                        </span>
                        <span className="text-slate-500">
                          Yesterday · 6:03 PM · by Audit
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Removed duplicate bullets and added Manuals section from source docs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          v3 · Specs synced from Extract
                        </span>
                        <span className="text-slate-500">
                          2 days ago · 11:41 AM · by Extract
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Dimensions, materials, and regulatory fields updated from latest
                        manufacturer crawl.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    disabled
                  >
                    View diff
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-70"
                    disabled
                  >
                    Restore version
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
                In the live product, you&apos;ll be able to filter by field (Specs, SEO,
                Price) and quickly roll back only the pieces you care about.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                How Versioning works with other modules
              </h3>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • Capture changes triggered by Extract, Describe, SEO, and Import jobs.
                </li>
                <li>
                  • Tie Monitor alerts back to the exact versions that caused issues.
                </li>
                <li>
                  • Let Audit reference previous versions when scoring regressions.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
