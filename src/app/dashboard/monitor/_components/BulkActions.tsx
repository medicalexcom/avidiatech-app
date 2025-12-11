// src/app/dashboard/monitor/_components/BulkActions.tsx
"use client";

import React from "react";

type BulkActionsProps = {
  selectedCount?: number;
};

export default function BulkActions({ selectedCount = 0 }: BulkActionsProps) {
  const hasSelection = selectedCount > 0;

  return (
    <section className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-medium text-slate-50 dark:bg-slate-100 dark:text-slate-900">
          {hasSelection ? `${selectedCount} selected` : "No items selected"}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Apply actions to multiple monitored products at once.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!hasSelection}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Re-run checks
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Snooze alerts
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70"
        >
          Remove from monitor
        </button>
      </div>
    </section>
  );
}
