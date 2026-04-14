"use client";

import React from "react";
import ImportUploader from "@/components/imports/ImportUploader";

/**
 * /imports/new
 * Minimal page that renders only the canonical ImportUploader component so users can upload CSV/XLSX
 * and create an import job.
 */

export default function NewImportPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#09090b] px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-emerald-400/10 dark:bg-emerald-500/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-sky-400/8 dark:bg-cyan-500/8 blur-[100px]" />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.1) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />
      <div className="w-full max-w-xl">
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg dark:shadow-2xl">
          <h1 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Create import</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Upload a CSV or Excel file. Max rows: 5000, Max columns: 50.
          </p>

          <ImportUploader
            bucket="imports"
            onCreated={(jobId) => {
              // optional: navigate to job page or show toast
              if (jobId) {
                // prefer to use the ingestion/job id as the canonical ingestion id
                window.location.href = `/imports/${jobId}`;
              } else {
                // fallback: reload
                window.location.reload();
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
