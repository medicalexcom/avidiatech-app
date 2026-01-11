"use client";

import React from "react";

export type MonitorResult = {
  id: string;
  source_url: string;
  status: string;
  last_checked: string;
  notes?: string;
};

type ResultsTableProps = {
  results?: MonitorResult[];
};

export default function ResultsTable({ results }: ResultsTableProps) {
  const hasResults = results && results.length > 0;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Monitor results
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            See the latest checks on your monitored products and URLs.
          </p>
        </div>
        {hasResults && (
          <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-50 dark:bg-slate-100 dark:text-slate-900">
            {results.length} item{results.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <p className="font-medium text-slate-600 dark:text-slate-300">
            No monitor results yet.
          </p>
          <p>
            Start by uploading a CSV or pasting product data above. We&apos;ll
            show live checks here once Monitor runs.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100/90 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900/90 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Product / URL</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Last check</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results!.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200/80 hover:bg-slate-100/70 dark:border-slate-800/80 dark:hover:bg-slate-900/70"
                  >
                    <td className="max-w-[260px] px-3 py-2 align-top text-slate-800 dark:text-slate-100">
                      <div className="truncate text-xs font-medium">
                        {row.source_url}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          row.status === "ok"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : row.status === "warning"
                            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                            : row.status === "error"
                            ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                            : "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {row.status || "pending"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-slate-600 dark:text-slate-300">
                      {row.last_checked || "—"}
                    </td>
                    <td className="max-w-[260px] px-3 py-2 align-top text-slate-600 dark:text-slate-300">
                      <div className="line-clamp-2">
                        {row.notes || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
