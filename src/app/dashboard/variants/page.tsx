"use client";

/**
 * AvidiaVariants module page
 *
 * AvidiaVariants will group together different variations of the same product into a
 * single entity. It helps merchants manage color, size, and configuration options
 * while maintaining clean catalogs and clean downstream feeds.
 */

export default function VariantsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            Commerce &amp; Automation · AvidiaVariants
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaVariants
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Group related SKUs into clean variant families&mdash;color, size, configuration,
            or kit options&mdash;so your catalog stays sane while downstream storefronts,
            feeds, and analytics stay in sync.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
              <span className="text-sm font-semibold text-amber-200">
                In design · Early access soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout: overview + planned flows */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        {/* Left column: what it does / value */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Variant intelligence for messy catalogs
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaVariants will scan your existing catalog and group related SKUs into
              consolidated variant clusters&mdash;so instead of 15 separate rows for
              the same chair in different heights, you get one clean product with variants.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Automatically identifies <span className="font-medium">color, size, and configuration</span> options across your catalog.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Unifies duplicate listings</span> into coherent variant groups instead of fragmented SKUs.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Creates <span className="font-medium">canonical SKUs and variant codes</span> for cleaner inventory management and reporting.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Feeds directly into <span className="font-medium">Extract, Describe, and SEO</span> so variants and content stay aligned.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Typical use cases
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  E-commerce
                </div>
                <p className="mt-1.5">
                  Collapse long variant lists (colors, sizes, kits) into clean product detail
                  pages with selectable options instead of duplicate URLs.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Distribution &amp; B2B
                </div>
                <p className="mt-1.5">
                  Normalize manufacturer part numbers and internal SKUs into stable families
                  for quoting, ordering, and replenishment workflows.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: workflow + CTA */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaVariants will work
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Sync your catalog</div>
                  <p className="text-xs text-slate-400">
                    Pull products from AvidiaExtract or your commerce platform (BigCommerce,
                    Shopify, etc.) into a variant-ready workspace.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Detect and propose groups</div>
                  <p className="text-xs text-slate-400">
                    AvidiaVariants analyzes titles, attributes, and MPNs to propose variant
                    families with suggested option names (Color, Size, Pack, Configuration).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Approve and sync back</div>
                  <p className="text-xs text-slate-400">
                    Approve or tweak variant groups, then push them back to your store,
                    feeds, or PIM with consistent SKUs and option structures.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(251,191,36,0.55)] hover:bg-amber-400"
                disabled
              >
                Variant workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                You&apos;ll be able to open a dedicated variant workspace for AvidiaExtract
                rows or inbound store catalogs.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract</span> — use
                extracted specs and attribute fields to power smarter variant grouping.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaDescribe &amp; SEO</span>{" "}
                — generate unified product stories and SEO for the parent, with clean option
                labels pushed to variants.
              </li>
              <li>
                • <span className="font-medium text-slate-200">Commerce connectors</span> —
                push approved variant structures directly into MedicalEx or other connected
                storefronts.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
