import React from "react";
import { useCalculator } from "./CalculatorContext";

/**
 * Compact sticky calculator that mirrors the Basic controls.
 * Place this in the right column. It reads/writes the shared context.
 */

export default function SidebarMiniCalculator() {
  const ctx = useCalculator();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md dark:border-slate-800 dark:bg-slate-950/90" style={{ position: "sticky", top: 20 }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold">Calculator</h4>
          <div className="text-xs text-slate-500">Quick compute</div>
        </div>
      </div>

      <div className="text-xs mb-2">
        <label className="block text-xs text-slate-500 mb-1">Value</label>
        <input
          type="number"
          step="0.01"
          value={ctx.basicValue as number | ""}
          onChange={(e) => ctx.setBasicValue(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-md border px-2 py-1 text-sm"
        />
      </div>

      <div className="text-xs mb-2">
        <label className="block text-xs text-slate-500 mb-1">Rounding</label>
        <select value={ctx.basicRounding} onChange={(e) => ctx.setBasicRounding(e.target.value)} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="ends_99">Ends .99</option>
          <option value="round_05">Round to .05</option>
          <option value="round_int">Round to integer</option>
        </select>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ctx.includeShippingBuffer} onChange={(e) => ctx.setIncludeShippingBuffer(e.target.checked)} />
          Shipping buffer
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            await ctx.computeActive({ cost: Number(ctx.basicValue) || 0 });
          }}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm"
        >
          Compute
        </button>

        <button
          onClick={() => {
            // quick set source to custom so the top editor reflects this if needed
            ctx.setSelectedSource("custom");
          }}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm"
        >
          Edit rules
        </button>
      </div>

      {ctx.lastResult && (
        <div className="mt-3 bg-slate-50 p-2 rounded text-sm">
          <div className="text-xs text-slate-500">Last result</div>
          <div className="font-medium">{ctx.lastResult.result?.price ?? ctx.lastResult.error ?? "—"}</div>
        </div>
      )}
    </div>
  );
}
