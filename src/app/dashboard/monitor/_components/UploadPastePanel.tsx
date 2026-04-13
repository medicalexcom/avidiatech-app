"use client";

import React from "react";

type UploadPastePanelProps = {
  // extend later when you wire it to real logic
  className?: string;
};

export default function UploadPastePanel({ className }: UploadPastePanelProps) {
  return (
    <section
      className={
        [
          "rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-700",
          "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Upload or paste data
      </h2>
      <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
        Drop a CSV, upload a file, or paste product data here. We&apos;ll hook
        this up to the Monitor pipeline next.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Choose file
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Paste data
        </button>
      </div>
    </section>
  );
}
