"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { parsePasteOrCsv } from "@/lib/match/normalize";

type JobStatus = "queued" | "running" | "succeeded" | "failed";
type MatchResult = { row_id: string; status: string; matched_url?: string; confidence?: number };

type MatchJob = {
  jobId: string;
  status: JobStatus;
  total: number;
  processed: number;
  results: MatchResult[];
  error?: string;
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function UploadPastePanel() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<MatchJob | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/match/${encodeURIComponent(jobId)}`, { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      setJob((prev) => prev ? { ...prev, ...data } : data);
      if (data.status === "succeeded" || data.status === "failed") {
        stopPolling();
      }
    } catch {
      // silently continue polling
    }
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") setText(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setWarnings([]);
    setJob(null);
    stopPolling();

    const { items, warnings: parseWarnings } = parsePasteOrCsv(text);
    setWarnings(parseWarnings);

    try {
      const res = await fetch("/api/v1/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submit failed");
      const jobId: string = json.jobId ?? json.job_id;
      if (!jobId) throw new Error("No job ID returned");

      setJob({ jobId, status: "queued", total: items.length, processed: 0, results: [] });

      // Begin polling every 2s
      pollRef.current = setInterval(() => pollJob(jobId), 2000);
    } catch (err: any) {
      setWarnings((w) => [...w, String(err?.message ?? err)]);
    } finally {
      setSubmitting(false);
    }
  }

  const progressPct = job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Paste / drag-drop area */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-colors ${
          dragOver
            ? "border-sky-400 bg-sky-50/60 dark:border-sky-500 dark:bg-sky-950/30"
            : "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Paste SKUs or drop a CSV
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400"
          >
            Browse file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"supplier_name,sku,brand_name\nMcKesson,MCK-12345,McKesson\nMedline,MED-67890,Medline"}
          className="w-full resize-none rounded-b-2xl bg-transparent px-4 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/30">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Parse warnings</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
            {warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !text.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
      >
        {submitting && <Spinner />}
        {submitting ? "Submitting…" : "Run Match Job"}
      </button>

      {/* Job progress */}
      {job && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Match job</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{job.jobId}</p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              job.status === "succeeded"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                : job.status === "failed"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300"
                : job.status === "running"
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}>
              {job.status === "running" ? (
                <span className="inline-flex items-center gap-1"><Spinner />{job.status}</span>
              ) : job.status}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>{job.processed} / {job.total} processed</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Results preview */}
          {job.results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5">
                <span>Row ID</span>
                <span>Status</span>
                <span>Confidence</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-48 overflow-y-auto">
                {job.results.slice(0, 20).map((r) => (
                  <div key={r.row_id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center px-3 py-1.5 text-xs">
                    <span className="font-mono text-slate-700 dark:text-slate-200 truncate">{r.row_id}</span>
                    <span className={`text-[10px] font-medium ${r.status === "matched" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                      {r.status}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-right">
                      {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.error && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">{job.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
