"use client";

import React, { useEffect, useState } from "react";

type Delivery = {
  id: string;
  status: string;
  event: string;
  received_at: string;
  response_code?: number;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className || "h-3 w-3"} aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className || "h-3 w-3"} aria-hidden="true">
      <path d="M12 4L4 12M4 4l8 8" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className || "h-3.5 w-3.5"} aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className || "h-3 w-3"} aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 01-9.77 3.43" />
      <path d="M2.5 8a5.5 5.5 0 019.77-3.43" />
      <polyline points="2.5 4 2.5 8 6.5 8" />
      <polyline points="13.5 12 13.5 8 9.5 8" />
    </svg>
  );
}

export default function WebhooksManager() {
  const [endpoint, setEndpoint]   = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [logs, setLogs]           = useState<Delivery[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  async function fetchLogs() {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetch("/api/developer/webhooks/logs");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setLogsError(err?.message || "Failed to load delivery logs.");
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  async function addEndpoint() {
    const url = endpoint.trim();
    if (!url) { setAddError("Please enter a valid HTTPS URL."); return; }
    if (!url.startsWith("https://")) { setAddError("Endpoint must start with https://"); return; }

    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      setEndpoint("");
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
      // Refresh log after a short delay so new entry may appear
      setTimeout(() => fetchLogs(), 800);
    } catch (err: any) {
      setAddError(err?.message || "Failed to add endpoint. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function statusVariant(status: string) {
    if (status === "success" || status === "delivered") return "success";
    if (status === "failed" || status === "error") return "danger";
    return "warning";
  }

  const variantCls = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    danger:  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  } as const;

  return (
    <div className="max-w-4xl space-y-6">

      {/* ── Add endpoint ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-4">
          <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">Add webhook endpoint</h3>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            Receive real-time HTTP POST events when ingestions, pipeline runs, or jobs complete.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              type="url"
              value={endpoint}
              onChange={(e) => { setEndpoint(e.target.value); setAddError(null); }}
              onKeyDown={(e) => e.key === "Enter" && !adding && addEndpoint()}
              placeholder="https://your-server.com/webhooks/avidiatech"
              className={[
                "w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-all",
                "bg-white dark:bg-slate-950",
                "text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600",
                addError
                  ? "border-red-400 ring-2 ring-red-400/20 dark:border-red-500/60"
                  : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:focus:border-indigo-500/60",
              ].join(" ")}
              disabled={adding}
            />
            {addError && (
              <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                <XIcon className="h-3 w-3 shrink-0" />
                {addError}
              </p>
            )}
            {addSuccess && (
              <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3 w-3 shrink-0" />
                Endpoint added successfully.
              </p>
            )}
          </div>
          <button
            onClick={addEndpoint}
            disabled={adding || !endpoint.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {adding ? "Adding…" : "Add endpoint"}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          Endpoints must use HTTPS. Each delivery is signed with an&nbsp;
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10.5px] dark:bg-slate-800">X-AvidiaTech-Signature</code>
          &nbsp;header for verification.
        </p>
      </div>

      {/* ── Delivery log ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Recent deliveries
          </p>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Refresh deliveries"
            aria-label="Refresh deliveries"
          >
            <RefreshIcon className={logsLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {logsLoading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-11 rounded-xl" />
            ))}
          </div>
        ) : logsError ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{logsError}</p>
            <button
              onClick={fetchLogs}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-medium text-slate-600 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshIcon />
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-slate-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-4 6 6 4-4" />
                <rect x="2" y="14" width="16" height="4" rx="1" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No deliveries yet</p>
            <p className="text-[12px] text-slate-400 dark:text-slate-500">
              Add an endpoint above and trigger an ingestion to see deliveries here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((l) => {
              const variant = statusVariant(l.status);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-[12px] transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${variantCls[variant]}`}>
                      {l.status}
                    </span>
                    <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {l.event}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                    {l.response_code != null && (
                      <span className={`font-mono ${l.response_code >= 200 && l.response_code < 300 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {l.response_code}
                      </span>
                    )}
                    <span className="tabular-nums">
                      {new Date(l.received_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
