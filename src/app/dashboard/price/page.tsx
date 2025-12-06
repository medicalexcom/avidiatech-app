"use client";

/**
 * AvidiaPrice module page
 *
 * AvidiaPrice provides a pricing engine that calculates recommended selling
 * prices based on your costs, margin targets, shipping buffers, and other
 * business rules. It helps ensure consistent, defensible profitability
 * across your catalog.
 */

export default function PricePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            Commerce &amp; Automation · AvidiaPrice
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            Pricing
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Use AvidiaPrice to turn raw costs into smart, policy-aligned prices. Plug in
            cost, shipping, and margin rules and get consistent recommendations with clear
            margin and profit math you can trust.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
              <span className="text-sm font-semibold text-emerald-200">
                Pricing rules defined · Engine wiring in progress
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
              Turn messy cost data into consistent prices
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaPrice takes your cost, shipping assumptions, and margin targets and
              calculates recommended selling prices that stay within your business rules.
              No more one-off spreadsheets—just a repeatable pricing engine that can scale
              with your catalog.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Price calculator:</span> input cost,
                  shipping buffers, fees, and target margin to get a suggested selling
                  price with explicit margin and gross profit breakdown.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Batch pricing:</span> apply your pricing
                  rules to a list of SKUs in bulk so large catalogs can be priced or
                  re-priced without manual edits.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Range checks:</span> receive warnings
                  when suggested prices fall outside configured minimum or maximum
                  thresholds (too low for margin, too high for market).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <span className="font-medium">Export-aware:</span> include calculated
                  prices directly in your product exports so Import / Export and store
                  sync always use the latest pricing logic.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Pricing scenarios AvidiaPrice supports
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Cost-plus with buffers
                </div>
                <p className="mt-1.5">
                  Apply a base margin on cost, add shipping and packaging buffers, and
                  layer in platform fees so every SKU has an honest margin baked in.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Catalog-wide updates
                </div>
                <p className="mt-1.5">
                  Reprice entire brands, categories, or cost-change batches in one run,
                  instead of chasing rows across spreadsheets and exports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: planned workflow / integration story */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaPrice will run
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Define pricing rules</div>
                  <p className="text-xs text-slate-400">
                    Configure default margin targets, shipping buffers, fee assumptions,
                    and min/max thresholds for your store, brand, or category.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Run calculator or batch jobs</div>
                  <p className="text-xs text-slate-400">
                    Use the single-SKU calculator for quick scenarios, or send entire
                    batches from AvidiaExtract / Import for bulk calculations with the
                    same rules.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Review, adjust, and export</div>
                  <p className="text-xs text-slate-400">
                    Review suggested prices, inspect margin/profit details, override edge
                    cases if needed, then push final prices into exports or directly into
                    connected stores.
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
                Pricing workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                A dedicated Pricing workspace will let you simulate scenarios, run batch
                pricing jobs, and preview impact before anything syncs to MedicalEx or
                other storefronts.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract</span> — pull
                cost, brand, and category info to seed pricing runs.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaImport</span> — inject
                calculated prices into export payloads automatically.
              </li>
              <li>
                • <span className="font-medium text-slate-200">Dashboards / Analytics</span>{" "}
                — feed pricing outputs into future reporting on margin and profitability.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
