"use client";
import React, { useState } from "react";

type MatchStatus = "pending" | "confirmed" | "rejected" | "ingesting" | "ingested";

type MatchRow = {
  id: string;
  sku: string;
  brand_hint: string;
  candidate_url: string;
  confidence: number;
  status: MatchStatus;
  product_name?: string;
};

function StatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, string> = {
    pending: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
    confirmed: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300",
    rejected: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300",
    ingesting: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
    ingested: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-500/30 dark:text-sky-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide ${map[status]}`}>
      {status === "ingesting" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {status}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-sky-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">{pct}%</span>
    </div>
  );
}

type Props = {
  rows?: MatchRow[];
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onIngest?: (id: string) => void;
};

export default function ResultsTable({ rows = [], onConfirm, onReject, onIngest }: Props) {
  const [localRows, setLocalRows] = useState<MatchRow[]>(rows);
  const [actingId, setActingId] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  async function act(id: string, action: "confirm" | "reject" | "ingest") {
    setActingId(id);
    await new Promise((r) => setTimeout(r, 500));
    if (action === "confirm") {
      setLocalRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "confirmed" } : r));
      onConfirm?.(id);
    } else if (action === "reject") {
      setLocalRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
      onReject?.(id);
    } else {
      setLocalRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "ingesting" } : r));
      onIngest?.(id);
      await new Promise((r) => setTimeout(r, 1200));
      setLocalRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "ingested" } : r));
    }
    setActingId(null);
  }

  if (!localRows.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 py-12 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-600">
        <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No match results yet — submit a job above</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1.8fr)_auto_auto] items-center border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 gap-3 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
        <span>SKU</span>
        <span>Brand</span>
        <span>Confidence</span>
        <span>Candidate URL</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {localRows.map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1.8fr)_auto_auto] items-center px-4 py-3 gap-3 text-xs">
            <div className="min-w-0">
              <p className="font-mono font-medium text-slate-800 dark:text-slate-100 truncate">{row.sku}</p>
              {row.product_name && <p className="text-[12px] text-slate-400 truncate">{row.product_name}</p>}
            </div>
            <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.brand_hint}</span>
            <ConfidenceBar score={row.confidence} />
            <a
              href={row.candidate_url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sky-600 hover:underline dark:text-sky-400"
            >
              {row.candidate_url}
            </a>
            <StatusBadge status={row.status} />
            <div className="flex gap-1 shrink-0">
              {row.status === "pending" && (
                <>
                  <button
                    onClick={() => act(row.id, "confirm")}
                    disabled={actingId === row.id}
                    className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => act(row.id, "reject")}
                    disabled={actingId === row.id}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                  >
                    Reject
                  </button>
                </>
              )}
              {row.status === "confirmed" && (
                <button
                  onClick={() => act(row.id, "ingest")}
                  disabled={actingId === row.id}
                  className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-[12px] font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-300"
                >
                  Ingest
                </button>
              )}
              {(row.status === "rejected" || row.status === "ingested" || row.status === "ingesting") && (
                <span className="text-[12px] text-slate-400 dark:text-slate-600">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
