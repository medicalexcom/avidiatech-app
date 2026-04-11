"use client";
import React from "react";

type JobProgressProps = {
  submitted?: number;
  candidates?: number;
  matched?: number;
  failed?: number;
  status?: "idle" | "running" | "succeeded" | "failed";
};

export default function JobProgress({
  submitted = 0,
  candidates = 0,
  matched = 0,
  failed = 0,
  status = "idle",
}: JobProgressProps) {
  const pct = submitted > 0 ? Math.round((matched / submitted) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Match job progress
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Track candidate generation and match rates.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            status === "running"
              ? "bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300"
              : status === "succeeded"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300"
              : status === "failed"
              ? "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300"
              : "bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
          }`}>
            {status === "running" && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
            {status === "idle" ? "Idle" : status}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Submitted", value: submitted, color: "text-slate-700 dark:text-slate-200" },
          { label: "Candidates", value: candidates, color: "text-sky-600 dark:text-sky-400" },
          { label: "Matched", value: matched, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Failed", value: failed, color: "text-rose-600 dark:text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-50/80 px-2 py-1.5 dark:bg-slate-900/60">
            <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {submitted > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-600 mb-1">
            <span>Match rate</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
            <div className="flex h-full">
              <div className="h-full bg-emerald-500/80 transition-all" style={{ width: `${pct}%` }} />
              <div className="h-full bg-rose-500/80 transition-all" style={{ width: `${submitted > 0 ? (failed / submitted) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
