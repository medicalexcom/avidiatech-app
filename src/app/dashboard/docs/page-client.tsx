"use client";

import React, { useState, useRef } from "react";
import PageShell from "@/components/layout/PageShell";

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

/* Document extraction results come from the upload API */

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

    try {
      const newResults: DocResult[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/upload", { method: "POST", body: formData });
        const json = await res.json();

        if (res.ok && !json.error) {
          newResults.push({
            filename: file.name,
            pageCount: json.page_count ?? 0,
            productName: json.product_name ?? file.name.replace(/\.[^.]+$/, ""),
            summary: json.summary ?? "Document processed successfully.",
            warnings: json.warnings ?? [],
            fields: (json.fields ?? []).map((f: any) => ({
              key: f.key ?? f.label ?? "",
              label: f.label ?? f.key ?? "",
              value: f.value ?? "",
              type: f.type ?? "spec",
              confidence: f.confidence ?? 0.9,
            })),
          });
        } else {
          showToast(`Failed to process ${file.name}: ${json.error ?? "unknown error"}`);
        }
      }

      if (newResults.length > 0) {
        setResults((prev) => [...newResults, ...prev]);
        setActiveResult(newResults[0]);
        showToast(`${newResults.length} document${newResults.length > 1 ? "s" : ""} processed.`);
      }
    } catch {
      showToast("Upload failed — check your connection");
    } finally {
      setProcessing(false);
    }
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
    <PageShell glow="orange">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <>
        {/* HEADER */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
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
              <p className="text-[12px] text-slate-400">or</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 rounded-lg border border-violet-300/60 bg-violet-50 px-4 py-1.5 text-[12px] font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
              >
                Browse files
              </button>
              <input ref={fileRef} type="file" multiple accept=".pdf" className="hidden" onChange={(e) => processDocs(e.target.files)} />
            </div>

            {/* Document list */}
            {results.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/85">
                <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Processed ({results.length})</p>
                <div className="space-y-1.5">
                  {results.map((r) => (
                    <button
                      key={r.filename}
                      onClick={() => setActiveResult(r)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] transition ${
                        activeResult?.filename === r.filename
                          ? "border border-violet-300/60 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-950/70"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-200">{r.filename}</span>
                      <span className="text-[12px] text-slate-400">{r.fields.length} fields</span>
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
                <p className="text-[12px] text-slate-500">Upload a PDF or load a sample to see extraction results.</p>
              </div>
            )}

            {!processing && activeResult && (
              <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85 overflow-hidden">
                {/* Doc header */}
                <div className="border-b border-slate-100 bg-violet-50/50 px-5 py-4 dark:border-slate-800 dark:bg-violet-500/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-slate-400">{activeResult.filename} · {activeResult.pageCount} pages</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">{activeResult.productName}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => pushToSpecs(activeResult)} className="rounded-full border border-cyan-300/60 bg-cyan-50 px-2.5 py-1 text-[12px] font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300">
                        Push to Specs
                      </button>
                      <button onClick={() => exportFields(activeResult)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">{activeResult.summary}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Warnings */}
                  {activeResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2.5 dark:border-rose-500/30 dark:bg-rose-500/5">
                      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">⚠ Critical warnings</p>
                      <ul className="space-y-0.5">
                        {activeResult.warnings.map((w) => (
                          <li key={w} className="text-[12px] text-rose-700 dark:text-rose-300">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fields table */}
                  <div>
                    <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Extracted fields ({activeResult.fields.length})</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <span>Label</span>
                        <span>Value</span>
                        <span>Type</span>
                        <span>Conf.</span>
                      </div>
                      {activeResult.fields.map((f) => (
                        <div key={f.key} className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-x-3 border-b border-slate-50 px-3 py-2 text-[12px] last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-950/40">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{f.label}</span>
                          <span className="text-slate-600 dark:text-slate-300">{f.value}</span>
                          <TypeBadge type={f.type} />
                          <span className={`text-[12px] font-semibold tabular-nums ${f.confidence >= 0.95 ? "text-emerald-600" : f.confidence >= 0.88 ? "text-amber-600" : "text-rose-500"}`}>
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
      </>
    </PageShell>
  );
}
