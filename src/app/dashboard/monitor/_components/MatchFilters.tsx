"use client";

import React from "react";

type MatchFiltersProps = {
  // You can extend this later with real filter state/handlers
  className?: string;
};

export default function MatchFilters({ className }: MatchFiltersProps) {
  return (
    <section
      className={
        [
          "rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs shadow-sm",
          "dark:border-slate-800 dark:bg-slate-950/70",
          className,
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Monitor filters
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Narrow down monitored items by status and signal type.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-slate-100/80 px-1.5 py-1 dark:bg-slate-900/70">
            <button
              type="button"
              className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-50 shadow-sm dark:bg-slate-100 dark:text-slate-900"
            >
              All
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              OK
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[10px] text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10"
            >
              Warnings
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              Errors
            </button>
          </div>

          {/* Time range + search (non-functional placeholders for now) */}
          <select className="h-7 rounded-full border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>

          <input
            type="search"
            placeholder="Search URL / SKU"
            className="h-7 min-w-[160px] rounded-full border border-slate-200 bg-white px-3 text-[11px] text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400"
          />
        </div>
      </div>
    </section>
  );
}
