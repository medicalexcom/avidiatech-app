"use client";

import React, { useState } from "react";
import PageShell from "@/components/layout/PageShell";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedStatus = "active" | "paused" | "error" | "pending";

interface Feed {
  id: string;
  name: string;
  source: string;
  format: string;
  destination: string;
  status: FeedStatus;
  lastRun: string;
  totalRows: number;
  normalizedRows: number;
  missingFields: number;
}

// ─── Sample feeds ─────────────────────────────────────────────────────────────
const INITIAL_FEEDS: Feed[] = [
  { id: "f1", name: "Medline Distributor CSV", source: "SFTP · medline.com", format: "CSV", destination: "MedicalEx (BigCommerce)", status: "active", lastRun: "Apr 6, 2026", totalRows: 14820, normalizedRows: 12430, missingFields: 247 },
  { id: "f2", name: "McKesson API Feed", source: "REST API · mckesson.com", format: "JSON", destination: "MedicalEx (BigCommerce)", status: "active", lastRun: "Apr 7, 2026", totalRows: 9203, normalizedRows: 8971, missingFields: 88 },
  { id: "f3", name: "Drive Medical Products", source: "FTP upload · drivemedical.com", format: "CSV", destination: "Google Shopping", status: "paused", lastRun: "Mar 28, 2026", totalRows: 3450, normalizedRows: 3190, missingFields: 52 },
  { id: "f4", name: "Omron Direct Feed", source: "EDI · omron.com", format: "EDI 832", destination: "Amazon Marketplace", status: "error", lastRun: "Apr 5, 2026", totalRows: 620, normalizedRows: 580, missingFields: 14 },
];

const DESTINATIONS = ["MedicalEx (BigCommerce)", "Google Shopping", "Amazon Marketplace", "Shopify", "Custom webhook"];
const FORMATS = ["CSV", "JSON", "EDI 832", "XML", "Parquet"];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FeedStatus }) {
  const map: Record<FeedStatus, { label: string; cls: string }> = {
    active: { label: "Active", cls: "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" },
    paused: { label: "Paused", cls: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" },
    error: { label: "Error", cls: "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300" },
    pending: { label: "Pending", cls: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-400" : status === "error" ? "bg-rose-400" : status === "paused" ? "bg-amber-400" : "bg-slate-400"}`} />
      {label}
    </span>
  );
}

// ─── Coverage bar ─────────────────────────────────────────────────────────────
function CoverageBar({ normalized, total }: { normalized: number; total: number }) {
  const pct = total > 0 ? (normalized / total) * 100 : 0;
  const color = pct >= 90 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>(INITIAL_FEEDS);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  // New feed form
  const [newName, setNewName] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newFormat, setNewFormat] = useState("CSV");
  const [newDest, setNewDest] = useState("MedicalEx (BigCommerce)");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleStatus(id: string) {
    setFeeds((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const next: FeedStatus = f.status === "active" ? "paused" : f.status === "paused" ? "active" : f.status;
      return { ...f, status: next };
    }));
  }

  function deleteFeed(id: string) {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    setSelectedFeed(null);
    showToast("Feed removed.");
  }

  function runFeed(id: string) {
    const feed = feeds.find((f) => f.id === id);
    if (!feed) return;
    showToast(`"${feed.name}" run queued.`);
  }

  function addFeed() {
    if (!newName.trim() || !newSource.trim()) return;
    const id = `f${Date.now()}`;
    setFeeds((prev) => [...prev, {
      id,
      name: newName.trim(),
      source: newSource.trim(),
      format: newFormat,
      destination: newDest,
      status: "pending",
      lastRun: "Never",
      totalRows: 0,
      normalizedRows: 0,
      missingFields: 0,
    }]);
    setNewName(""); setNewSource("");
    setShowAdd(false);
    showToast(`Feed "${newName.trim()}" added.`);
  }

  const totalRows = feeds.reduce((s, f) => s + f.totalRows, 0);
  const normalizedRows = feeds.reduce((s, f) => s + f.normalizedRows, 0);
  const activeFeeds = feeds.filter((f) => f.status === "active").length;
  const errorFeeds = feeds.filter((f) => f.status === "error").length;

  return (
    <PageShell glow="emerald">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* HEADER */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              Commerce &amp; Automation · AvidiaFeeds
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
              One{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-400 dark:from-emerald-300 dark:via-sky-200 dark:to-emerald-200">
                clean feed
              </span>{" "}
              for every channel you care about.
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage your product feed sources, monitor health, and push normalized data to any channel.
            </p>
          </div>

          <button
            onClick={() => setShowAdd((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] transition hover:-translate-y-px hover:bg-emerald-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add feed
          </button>
        </section>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total feeds", value: feeds.length, color: "#10b981" },
            { label: "Active", value: activeFeeds, color: "#06b6d4" },
            { label: "Errors", value: errorFeeds, color: "#f43f5e" },
            { label: "Coverage", value: totalRows > 0 ? `${Math.round((normalizedRows / totalRows) * 100)}%` : "—", color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add feed form */}
        {showAdd && (
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-500/30 dark:bg-emerald-500/5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">New feed source</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                placeholder="Feed name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                placeholder="Source URL or description"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select
                value={newDest}
                onChange={(e) => setNewDest(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addFeed} disabled={!newName.trim() || !newSource.trim()} className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60">
                Add feed
              </button>
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Feed table */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span>Feed</span>
            <span>Destination</span>
            <span>Coverage</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {feeds.map((feed) => (
            <div
              key={feed.id}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-slate-50 px-5 py-3.5 text-[11px] last:border-0 hover:bg-slate-50/80 dark:border-slate-900 dark:hover:bg-slate-950/50 ${selectedFeed === feed.id ? "bg-sky-50/50 dark:bg-sky-500/5" : ""}`}
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{feed.name}</p>
                <p className="text-[10px] text-slate-400">{feed.source} · {feed.format} · Last: {feed.lastRun}</p>
              </div>
              <span className="self-center text-slate-600 dark:text-slate-300">{feed.destination}</span>
              <div className="self-center">
                <CoverageBar normalized={feed.normalizedRows} total={feed.totalRows} />
                <p className="mt-0.5 text-[10px] text-slate-400">{feed.normalizedRows.toLocaleString()}/{feed.totalRows.toLocaleString()} rows</p>
              </div>
              <div className="self-center">
                <StatusBadge status={feed.status} />
                {feed.missingFields > 0 && (
                  <p className="mt-0.5 text-[10px] text-rose-500">{feed.missingFields} missing fields</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => runFeed(feed.id)} title="Run now" className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleStatus(feed.id)}
                  title={feed.status === "active" ? "Pause" : "Resume"}
                  disabled={feed.status === "error" || feed.status === "pending"}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    {feed.status === "active"
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />}
                  </svg>
                </button>
                <button onClick={() => deleteFeed(feed.id)} title="Delete" className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Consolidated summary */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Consolidated catalog summary</h2>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Sources</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{feeds.length} feeds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Raw rows</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{totalRows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Normalized SKUs</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{normalizedRows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Ready for export</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {Math.round(normalizedRows * 0.96).toLocaleString()} rows
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Export channel feeds</h2>
            <div className="space-y-2">
              {DESTINATIONS.slice(0, 4).map((dest) => (
                <div key={dest} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[11px] text-slate-700 dark:text-slate-200">{dest}</span>
                  <button
                    onClick={() => showToast(`Export to "${dest}" queued.`)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    Export →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
    </PageShell>
  );
}
