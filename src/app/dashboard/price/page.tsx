"use client";

import PriceWorkspace from "@/components/price/PriceWorkspace";
import CalculatorCard from "@/components/CalculatorCard";
import SidebarMiniCalculator from "@/components/Calculator/SidebarMiniCalculator";
import { CalculatorProvider } from "@/components/Calculator/CalculatorContext";

/**
 * Page now wraps content in CalculatorProvider so top CalculatorCard and the
 * right-column SidebarMiniCalculator share identical state and compute behavior.
 */

export default function PricePage() {
  const tenantId: string | null = null;

  return (
    <CalculatorProvider tenantId={tenantId}>
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
        {/* Ambient background omitted for brevity */}
        <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
          {/* header left and status card (unchanged) */}
          <section className="mb-2 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* left header preserved (omitted here for brevity) */}
            <div className="space-y-4 max-w-2xl flex-1 min-w-[260px]">
              {/* ... same content as before ... */}
            </div>

            {/* Right: keep status card and mini calculator (sticky) */}
            <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 sm:px-5 sm:py-4 space-y-3 shadow-md dark:border-slate-800 dark:bg-slate-950/90">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Module status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">Pricing workspace live (MVP)</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:bg-slate-900 dark:border-slate-700">Pricing engine</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Compute → approve → push. Import will honor store_price when present.</p>
              </div>

              {/* Sticky compact calculator in the right column */}
              <SidebarMiniCalculator />
            </div>
          </section>

          {/* Combined top calculator card */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md dark:border-slate-800 dark:bg-slate-950/90">
            <CalculatorCard tenantId={tenantId} />
          </div>

          {/* Price workspace */}
          <PriceWorkspace />
        </div>
      </main>
    </CalculatorProvider>
  );
}
