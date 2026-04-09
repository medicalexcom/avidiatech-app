"use client";

import React, { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocField {
  key: string;
  label: string;
  value: string;
  type: "spec" | "warning" | "feature" | "compliance";
  confidence: number;
}

interface DocResult {
  filename: string;
  pageCount: number;
  productName: string;
  fields: DocField[];
  warnings: string[];
  summary: string;
}

// ─── Sample extraction results ─────────────────────────────────────────────────
const SAMPLE_RESULTS: DocResult[] = [
  {
    filename: "McKesson-IV-Pole-IFU.pdf",
    pageCount: 12,
    productName: "McKesson IV Pole, Stainless Steel, 5-Leg Base",
    summary: "Height-adjustable IV pole for clinical and home use. Supports standard infusion bags and pole-mounted pumps. Designed for smooth and textured floor surfaces.",
    warnings: [
      "Do not exceed 30 lb (13.6 kg) weight limit.",
      "Ensure all locking mechanisms are engaged before loading.",
      "Not intended for overhead patient transport.",
    ],
    fields: [
      { key: "height_range", label: "Height range", value: "49–88 in (124–224 cm)", type: "spec", confidence: 0.98 },
      { key: "weight_capacity", label: "Weight capacity", value: "30 lbs (13.6 kg)", type: "spec", confidence: 0.97 },
      { key: "base_type", label: "Base", value: "5-leg low profile, 26 in diameter", type: "spec", confidence: 0.95 },
      { key: "material", label: "Material", value: "304 stainless steel", type: "spec", confidence: 0.96 },
      { key: "hook_count", label: "Hooks", value: "6 stainless hooks", type: "spec", confidence: 0.94 },
      { key: "cleaning", label: "Cleaning", value: "Hospital-grade quaternary ammonium or isopropyl alcohol. Do not submerge.", type: "feature", confidence: 0.91 },
      { key: "warranty", label: "Warranty", value: "1-year manufacturer limited warranty", type: "compliance", confidence: 0.99 },
      { key: "do_not_exceed", label: "Critical warning", value: "Do not exceed 30 lb weight limit", type: "warning", confidence: 0.99 },
    ],
  },
  {
    filename: "Omron-HEM-7361T-IFU.pdf",
    pageCount: 28,
    productName: "Omron HEM-7361T Upper Arm Blood Pressure Monitor",
    summary: "Clinical-grade blood pressure monitor for upper arm use. Supports Bluetooth data transfer to Omron Connect app. Validated for hypertension screening.",
    warnings: [
      "Not intended for use on patients in atrial fibrillation.",
      "Measurement errors may occur in patients with tremors.",
      "Ensure cuff is at heart level during measurement.",
    ],
    fields: [
      { key: "measurement_range_bp", label: "BP range", value: "20–280 mmHg", type: "spec", confidence: 0.99 },
      { key: "accuracy_bp", label: "Accuracy", value: "±3 mmHg", type: "spec", confidence: 0.98 },
      { key: "cuff_range", label: "Cuff size", value: "9–17 in (22–42 cm)", type: "spec", confidence: 0.97 },
      { key: "power", label: "Power", value: "4 AA batteries or AC adapter", type: "spec", confidence: 0.96 },
      { key: "memory", label: "Memory", value: "100 readings per user (2 users)", type: "feature", confidence: 0.93 },
      { key: "bluetooth", label: "Connectivity", value: "Bluetooth 4.0 — Omron Connect app", type: "feature", confidence: 0.95 },
      { key: "regulatory", label: "Clearance", value: "FDA 510(k) cleared", type: "compliance", confidence: 0.99 },
      { key: "afib_warning", label: "AFIB warning", value: "Not for use in atrial fibrillation patients", type: "warning", confidence: 0.98 },
    ],
  },
];

// ─── Field type badge ─────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: DocField["type"] }) {
  const map: Record<DocField["type"], { label: string; cls: string }> = {
    spec: { label: "Spec", cls: "border-cyan-300/60 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300" },
    feature: { label: "Feature", cls: "border-violet-300/60 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300" },
    warning: { label: "Warning", cls: "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300" },
    compliance: { label: "Compliance", cls: "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" },
  };
  const { label, cls } = map[type];
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${cls}`}>{label}</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [results, setResults] = useState<DocResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeResult, setActiveResult] = useState<DocResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function processDocs(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));

    // Map file names to samples or use generic
    const newResults: DocResult[] = Array.from(files).map((file, i) => {
      const sample = SAMPLE_RESULTS[i % SAMPLE_RESULTS.length];
      return { ...sample, filename: file.name };
    });

    setResults((prev) => [...newResults, ...prev]);
    setActiveResult(newResults[0]);
    setProcessing(false);
    showToast(`${files.length} document${files.length > 1 ? "s" : ""} processed.`);
  }

  function loadSample(idx: number) {
    const sample = SAMPLE_RESULTS[idx];
    setResults((prev) => {
      const exists = prev.some((r) => r.filename === sample.filename);
      return exists ? prev : [sample, ...prev];
    });
    setActiveResult(sample);
    showToast(`Sample loaded: ${sample.filename}`);
  }

  function exportFields(result: DocResult) {
    const csv = ["key,label,value,type,confidence",
      ...result.fields.map((f) => `${f.key},"${f.label}","${f.value}",${f.type},${f.confidence}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.filename.replace(".pdf", "")}-extracted.csv`;
    a.click();
    showToast("Fields exported.");
  }

  function pushToSpecs(result: DocResult) {
    showToast(`${result.fields.filter((f) => f.type === "spec").length} spec fields pushed to AvidiaSpecs.`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* HEADER */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            Data Intelligence · AvidiaDocs
          </div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
            Turn dense manuals into{" "}
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-sky-300">
              structured, reusable product data
            </span>.
          </h1>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Upload PDFs, IFUs, or data sheets. AvidiaDocs extracts specs, warnings, features, and compliance data — ready to push to your catalog.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* LEFT: upload + document list */}
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? "border-violet-400 bg-violet-50/50 dark:bg-violet-500/5"
                  : "border-slate-200 bg-white/95 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/85"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); processDocs(e.dataTransfer.files); }}
            >
              <svg className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">Drop PDFs here</p>
              <p className="text-[11px] text-slate-400">or</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 rounded-lg border border-violet-300/60 bg-violet-50 px-4 py-1.5 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
              >
                Browse files
              </button>
              <input ref={fileRef} type="file" multiple accept=".pdf" className="hidden" onChange={(e) => processDocs(e.target.files)} />
            </div>

            {/* Sample docs */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/85">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Sample documents</p>
              {SAMPLE_RESULTS.map((s, i) => (
                <button
                  key={s.filename}
                  onClick={() => loadSample(i)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[11px] transition hover:bg-slate-50 dark:hover:bg-slate-950/70"
                >
                  <svg className="h-7 w-7 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{s.filename}</p>
                    <p className="text-[10px] text-slate-400">{s.pageCount} pages · {s.fields.length} fields extractable</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Document list */}
            {results.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/85">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Processed ({results.length})</p>
                <div className="space-y-1.5">
                  {results.map((r) => (
                    <button
                      key={r.filename}
                      onClick={() => setActiveResult(r)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] transition ${
                        activeResult?.filename === r.filename
                          ? "border border-violet-300/60 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-950/70"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-200">{r.filename}</span>
                      <span className="text-[10px] text-slate-400">{r.fields.length} fields</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: extraction results */}
          <div>
            {processing && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-14 text-center dark:border-slate-800">
                <svg className="h-8 w-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-600 dark:text-slate-300">Processing document…</p>
              </div>
            )}

            {!processing && !activeResult && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
                <span className="text-4xl">📄</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No document selected</p>
                <p className="text-[11px] text-slate-500">Upload a PDF or load a sample to see extraction results.</p>
              </div>
            )}

            {!processing && activeResult && (
              <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85 overflow-hidden">
                {/* Doc header */}
                <div className="border-b border-slate-100 bg-violet-50/50 px-5 py-4 dark:border-slate-800 dark:bg-violet-500/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-slate-400">{activeResult.filename} · {activeResult.pageCount} pages</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">{activeResult.productName}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => pushToSpecs(activeResult)} className="rounded-full border border-cyan-300/60 bg-cyan-50 px-2.5 py-1 text-[10px] font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300">
                        Push to Specs
                      </button>
                      <button onClick={() => exportFields(activeResult)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">{activeResult.summary}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Warnings */}
                  {activeResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2.5 dark:border-rose-500/30 dark:bg-rose-500/5">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">⚠ Critical warnings</p>
                      <ul className="space-y-0.5">
                        {activeResult.warnings.map((w) => (
                          <li key={w} className="text-[11px] text-rose-700 dark:text-rose-300">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fields table */}
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Extracted fields ({activeResult.fields.length})</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <span>Label</span>
                        <span>Value</span>
                        <span>Type</span>
                        <span>Conf.</span>
                      </div>
                      {activeResult.fields.map((f) => (
                        <div key={f.key} className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 border-b border-slate-50 px-3 py-2 text-[11px] last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-950/40">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{f.label}</span>
                          <span className="text-slate-600 dark:text-slate-300">{f.value}</span>
                          <TypeBadge type={f.type} />
                          <span className={`text-[10px] font-semibold tabular-nums ${f.confidence >= 0.95 ? "text-emerald-600" : f.confidence >= 0.88 ? "text-amber-600" : "text-rose-500"}`}>
                            {Math.round(f.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
