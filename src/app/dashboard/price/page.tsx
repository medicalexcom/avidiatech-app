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
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Ambient background: emerald bias for pricing */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-500/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER / HERO */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/45 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(16,185,129,0.4)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + description */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  Commerce &amp; Automation · AvidiaPrice
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-emerald-200">Pricing engine</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    Turn raw costs into{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-emerald-200 to-sky-200">
                      policy-aligned, profitable prices
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-300">
                    Use AvidiaPrice to transform cost data, shipping buffers, and margin rules
                    into consistent recommendations with clear math. No one-off spreadsheets—
                    just a repeatable pricing engine that can scale with your catalog.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/60 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-200">
                      Cost, shipping, and fees rolled into one price you can explain.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-sky-500/55 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span className="text-slate-200">
                      Batch-mode runs for brand, category, or ingest batches.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700/70 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span className="text-slate-200">
                      Export-aware: prices stay in sync with Import / Export.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + snapshot */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                        <span className="text-sm font-semibold text-emerald-200">
                          Pricing rules defined · Engine wiring in progress
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      Pricing engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AvidiaPrice will sit next to AvidiaExtract and Import to keep MedicalEx
                    and other stores priced with the same, transparent logic.
                  </p>
                </div>

                {/* Static pricing snapshot */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Sample pricing snapshot
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Cost</span>
                      <span className="text-slate-200 font-medium">$112.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Shipping / buffer</span>
                      <span className="text-slate-200 font-medium">$18.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Target margin</span>
                      <span className="text-emerald-300 font-medium">38%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-300">Suggested price</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-400/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                        $209.00
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    UI will let you tweak rules and see margin math for each product or batch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: two-column layout */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* LEFT: what it does / scenarios */}
          <div className="space-y-4">
            {/* What it does */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
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

            {/* Scenarios */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Pricing scenarios AvidiaPrice supports
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    Cost-plus with buffers
                  </div>
                  <p className="mt-1.5">
                    Apply a base margin on cost, add shipping and packaging buffers, and
                    layer in platform fees so every SKU has an honest margin baked in.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
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

          {/* RIGHT: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
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
                    <div className="font-medium text-slate-100">
                      Run calculator or batch jobs
                    </div>
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
                    <div className="font-medium text-slate-100">
                      Review, adjust, and export
                    </div>
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
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(16,185,129,0.55)] hover:bg-emerald-400 disabled:opacity-70"
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

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
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
              <p className="mt-3 text-[10px] text-slate-500">
                Over time, AvidiaPrice becomes the control tower for margin: every product,
                every brand, same rules, fully transparent math.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
