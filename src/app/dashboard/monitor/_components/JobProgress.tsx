"use client";

import React from "react";

type JobProgressProps = {
  // You can wire real data in later
  totalJobs?: number;
  runningJobs?: number;
  completedJobs?: number;
  failedJobs?: number;
};

export default function JobProgress({
  totalJobs = 0,
  runningJobs = 0,
  completedJobs = 0,
  failedJobs = 0,
}: JobProgressProps) {
  const hasActivity = totalJobs > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Monitor job progress
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Track running checks and see how many items have been processed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              {hasActivity ? `${runningJobs} running` : "Idle"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {totalJobs} total
          </span>
        </div>
      </div>

      {/* Simple mini bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80">
        <div className="flex h-full w-full">
          <div
            className="h-full bg-emerald-500/80"
            style={{
              width:
                totalJobs > 0
                  ? `${(completedJobs / totalJobs) * 100}%`
                  : "0%",
            }}
          />
          <div
            className="h-full bg-sky-500/80"
            style={{
              width:
                totalJobs > 0
                  ? `${(runningJobs / totalJobs) * 100}%`
                  : "0%",
            }}
          />
          <div
            className="h-full bg-rose-500/80"
            style={{
              width:
                totalJobs > 0
                  ? `${(failedJobs / totalJobs) * 100}%`
                  : "0%",
            }}
          />
        </div>
      </div>
    </section>
  );
}
