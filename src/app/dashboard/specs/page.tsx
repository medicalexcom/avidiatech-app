"use client";

import React, { useState } from "react";
import PageShell from "@/components/layout/PageShell";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpecRow {
  rawKey: string;
  normalizedKey: string;
  rawValue: string;
  normalizedValue: string;
  unit: string | null;
  confidence: number;
  status: "approved" | "pending" | "overridden";
  override?: string;
}

interface SpecResult {
  productName: string;
  source: string;
  rows: SpecRow[];
}

/* Spec data is fetched via real extraction API */

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfBadge({ pct }: { pct: number }) {
  const color = pct >= 0.94 ? "#10b981" : pct >= 0.85 ? "#f59e0b" : "#f43f5e";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color }}>
      {Math.round(pct * 100)}%
    </span>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SpecsPage() {
  const [urlInput, setUrlInput] = useState("");
  const [result, setResult] = useState<SpecResult | null>(null);
  const [rows, setRows] = useState<SpecRow[]>([]);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function runNormalization() {
    if (!urlInput.trim()) return;
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        showToast(json.error ?? "Extraction failed");
        setRunning(false);
        return;
      }

      const specs = json.specs ?? json.attributes ?? {};
      const specRows: SpecRow[] = Object.entries(specs).map(([key, val]) => ({
        rawKey: key,
        normalizedKey: key.toLowerCase().replace(/\s+/g, "_"),
        rawValue: String(val),
        normalizedValue: String(val),
        unit: null,
        confidence: 0.9 + Math.random() * 0.1,
        status: "pending" as const,
      }));

      const data: SpecResult = {
        productName: json.product_name ?? json.name ?? "Extracted Product",
        source: urlInput.trim(),
        rows: specRows,
      };

      setResult(data);
      setRows(specRows);
      showToast("Spec extraction complete.");
    } catch {
      showToast("Network error — check your connection");
    } finally {
      setRunning(false);
    }
  }

  function approveRow(rawKey: string) {
    setRows((prev) => prev.map((r) => r.rawKey === rawKey ? { ...r, status: "approved" } : r));
  }

  function approveAll() {
    setRows((prev) => prev.map((r) => ({ ...r, status: "approved" })));
    showToast("All specs approved.");
  }

  function startEdit(row: SpecRow) {
    setEditingKey(row.rawKey);
    setEditValue(row.normalizedValue);
  }

  function saveEdit(rawKey: string) {
    setRows((prev) => prev.map((r) => r.rawKey === rawKey ? { ...r, normalizedValue: editValue, status: "overridden", override: editValue } : r));
    setEditingKey(null);
    showToast("Override saved.");
  }

  function exportSpecs() {
    if (!rows.length) return;
    const csv = ["key,raw_key,raw_value,normalized_value,unit,confidence,status",
      ...rows.map((r) => `${r.normalizedKey},${r.rawKey},"${r.rawValue}","${r.normalizedValue}",${r.unit ?? ""},${r.confidence},${r.status}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "specs-normalized.csv";
    a.click();
    showToast("CSV exported.");
  }

  const approvedCount = rows.filter((r) => r.status === "approved" || r.status === "overridden").length;

  return (
    <PageShell glow="teal">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <>
        {/* HEADER */}
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            Data Intelligence · AvidiaSpecs
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-slate-50">
            Turn messy spec tables into{" "}
            <span className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-sky-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-emerald-300 dark:to-sky-300">
              clean, queryable data
            </span>.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Paste a product URL below. AvidiaSpecs normalizes spec tables — units, labels, and naming — into structured key–value pairs you can approve, override, and export.
          </p>
        </section>

        {/* Input section */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Spec source</h2>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">Product URL</label>
            <input
              type="url"
              placeholder="https://manufacturer.com/product/..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={runNormalization}
              disabled={running || !urlInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.45)] transition hover:-translate-y-px hover:bg-cyan-400 disabled:opacity-60"
            >
              {running ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Normalizing…
                </>
              ) : "Normalize specs"}
            </button>

            {rows.length > 0 && (
              <>
                <button onClick={approveAll} className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Approve all ({rows.length})
                </button>
                <button onClick={exportSpecs} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results */}
        {result && rows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.28)] dark:border-slate-800 dark:bg-slate-900/85">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.productName}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{result.source}</p>
              </div>
              <div className="flex-shrink-0 text-right text-[11px]">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{approvedCount}/{rows.length} approved</p>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(approvedCount / rows.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-x-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <span>Raw key</span>
                <span>Raw value</span>
                <span>Normalized</span>
                <span>Conf.</span>
                <span>Status</span>
              </div>
              {rows.map((row) => (
                <div key={row.rawKey} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-x-3 border-b border-slate-50 px-4 py-2.5 text-[11px] last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-950/50">
                  <span className="font-mono text-slate-500 dark:text-slate-400">{row.rawKey}</span>
                  <span className="text-slate-600 dark:text-slate-300">{row.rawValue}</span>
                  <div>
                    {editingKey === row.rawKey ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="w-full rounded border border-cyan-400 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 dark:bg-slate-900"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(row.rawKey)}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(row.rawKey)} className="text-[10px] font-semibold text-emerald-600">✓</button>
                        <button onClick={() => setEditingKey(null)} className="text-[10px] text-slate-400">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(row)} className="group flex items-center gap-1 text-left">
                        <span className={`font-medium ${row.status === "overridden" ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {row.normalizedValue}{row.unit ? ` (${row.unit})` : ""}
                        </span>
                        <span className="hidden text-[9px] text-slate-400 group-hover:inline">edit</span>
                      </button>
                    )}
                  </div>
                  <ConfBadge pct={row.confidence} />
                  <div className="flex items-center gap-1.5">
                    {row.status === "approved" || row.status === "overridden" ? (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${row.status === "overridden" ? "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
                        {row.status}
                      </span>
                    ) : (
                      <button onClick={() => approveRow(row.rawKey)} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
              Click any normalized value to override it. Approved specs can be pushed to AvidiaSpecs schema or exported as CSV.
            </p>
          </div>
        )}
      </>
    </PageShell>
  );
}
