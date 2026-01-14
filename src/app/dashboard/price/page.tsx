"use client";

import PriceWorkspace from "@/components/price/PriceWorkspace";
import CalculatorCard from "@/components/CalculatorCard";
import { CalculatorProvider } from "@/components/Calculator/CalculatorContext";

/**
 * Page layout:
 * - Full-width CalculatorCard above the workspace (single source-of-truth).
 * - PriceWorkspace below contains the compact, sticky right-column widget which now
 *   reflects the CalculatorProvider's basic fields and only appears when an ingestion
 *   is selected (pop behavior).
 */

export default function PricePage() {
  const tenantId: string | null = null;

  return (
    <CalculatorProvider tenantId={tenantId}>
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-emerald-300/26 blur-3xl dark:bg-emerald-500/25" />
          <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/24 blur-3xl dark:bg-sky-500/18" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        </div>

        <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
          {/* Header left and small status card on right */}
          <section className="mb-2 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4 max-w-2xl flex-1 min-w-[260px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                Commerce &amp; Automation · AvidiaPrice
                <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-emerald-700 dark:text-emerald-200">Pricing engine</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  Turn raw costs into{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-400 dark:from-emerald-300 dark:via-emerald-200 dark:to-sky-200">
                    policy-aligned, profitable prices
                  </span>
                  .
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Use AvidiaPrice to transform cost data, shipping buffers, and margin rules into consistent recommendations with clear math.
                </p>
              </div>
            </div>

            <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 sm:px-5 sm:py-4 space-y-3 shadow-md dark:border-slate-800 dark:bg-slate-950/90">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Module status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">Pricing workspace live (MVP)</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:bg-slate-900 dark:border-slate-700">
                    Pricing engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Compute → approve → push. Import will honor store_price when present.</p>
              </div>
            </div>
          </section>

          {/* Full-width main calculator (single source-of-truth) */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md dark:border-slate-800 dark:bg-slate-950/90">
            <CalculatorCard tenantId={tenantId} />
          </div>

          {/* Workspace below */}
          <PriceWorkspace />
        </div>
      </main>
    </CalculatorProvider>
  );
}
