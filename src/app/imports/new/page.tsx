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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-3">Create import</h1>
          <p className="text-sm text-slate-500 mb-4">
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
