"use client";

/**
 * AvidiaVariants module page
 *
 * AvidiaVariants will group together different variations of the same product into a
 * single entity. It helps merchants manage color, size, and configuration options
 * while maintaining clean catalogs and clean downstream feeds.
 */

import React from "react";

export default function VariantsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/18" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-orange-300/25 blur-3xl dark:bg-orange-500/18" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.96)_40%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* Header / hero row */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-100 to-slate-50 shadow-[0_0_60px_rgba(251,191,36,0.35)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-amber-500/45 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(251,191,36,0.45)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + copy */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-amber-50/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-900 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  Commerce &amp; Automation · AvidiaVariants
                  <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                  <span className="text-amber-700 dark:text-amber-200">
                    Concept stage
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50">
                    Turn scattered SKUs into{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 dark:from-amber-300 dark:via-amber-200 dark:to-yellow-300">
                      clean variant families
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Group related SKUs into color, size, configuration, or kit options so
                    your catalog stays sane while downstream storefronts, feeds, and
                    analytics stay perfectly in sync.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50/90 border border-amber-300 px-3 py-1.5 text-amber-900 dark:bg-slate-950/90 dark:border-amber-500/50 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>
                      Scans your AvidiaExtract / store catalog to propose variant families.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 border border-emerald-300 px-3 py-1.5 text-emerald-900 dark:bg-slate-950/90 dark:border-emerald-500/50 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      Builds canonical parents with stable variant codes and attributes.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/90 border border-sky-300 px-3 py-1.5 text-sky-900 dark:bg-slate-950/90 dark:border-sky-500/50 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span>
                      Designed to sync directly into commerce platforms and feeds.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status card */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0">
                <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                          In design · Early access soon
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] text-amber-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                      Commerce &amp; Automation
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    AvidiaVariants will launch as part of the Commerce &amp; Automation
                    layer, sitting alongside Price, Feeds, and Monitor to keep your product
                    graph coherent across channels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-column layout: overview + planned flows */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* Left column: what it does / value */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                Variant intelligence for messy catalogs
              </h2>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                AvidiaVariants will scan your existing catalog and group related SKUs into
                consolidated variant clusters&mdash;so instead of 15 separate rows for the
                same chair in different heights, you get one clean product with selectable
                options.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Automatically identifies{" "}
                    <span className="font-medium">color, size, and configuration</span>{" "}
                    options across your catalog using normalized attributes and titles.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Unifies duplicate listings</span> into
                    coherent variant groups instead of fragmented SKUs spread across feeds,
                    storefronts, and marketplaces.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Creates{" "}
                    <span className="font-medium">canonical SKUs and variant codes</span>{" "}
                    for cleaner inventory management, analytics, and reporting.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Feeds directly into{" "}
                    <span className="font-medium">Extract, Describe, and SEO</span> so
                    variants and content stay perfectly aligned with your automation rules.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                Typical use cases
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    E-commerce
                  </div>
                  <p className="mt-1.5">
                    Collapse long variant lists (colors, sizes, kits) into clean product
                    detail pages with selectable options instead of duplicate URLs and
                    cannibalized SEO.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    Distribution &amp; B2B
                  </div>
                  <p className="mt-1.5">
                    Normalize manufacturer part numbers and internal SKUs into stable
                    families for quoting, ordering, and replenishment workflows across
                    branches and teams.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: workflow + CTA */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                Planned workflow · how AvidiaVariants will work
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-slate-800 dark:text-amber-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Sync your catalog
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Pull products from AvidiaExtract or your commerce platform
                      (BigCommerce, Shopify, etc.) into a variant-ready workspace tied to
                      your tenant.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-slate-800 dark:text-amber-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Detect and propose groups
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      AvidiaVariants analyzes titles, attributes, MPNs, and GTINs to
                      propose variant families with suggested option names (Color, Size,
                      Pack, Configuration).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-slate-800 dark:text-amber-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Approve and sync back
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Approve or tweak variant groups, then push them back to your store,
                      feeds, or PIM with consistent SKUs and option structures that match
                      your automation rules.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(251,191,36,0.55)] hover:bg-amber-400 disabled:opacity-70"
                  disabled
                >
                  Variant workspace (coming soon)
                </button>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You&apos;ll be able to open a dedicated variant workspace for
                  AvidiaExtract rows or inbound store catalogs and review proposed
                  groupings in one view.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <span className="font-medium text-slate-900 dark:text-slate-200">AvidiaExtract</span> — use
                  extracted specs and attribute fields to power smarter variant grouping and
                  canonical parents.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    AvidiaDescribe &amp; AvidiaSEO
                  </span>{" "}
                  — generate unified product stories and SEO for the parent, with clean
                  option labels pushed to variants.
                </li>
                <li>
                  • <span className="font-medium text-slate-900 dark:text-slate-200">Commerce connectors</span>{" "}
                  — push approved variant structures directly into MedicalEx or other
                  connected storefronts and feeds.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Once live, this module will be a bridge between your ingestion layer and
                commerce systems, so variant logic never lives in one-off spreadsheets
                again.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
