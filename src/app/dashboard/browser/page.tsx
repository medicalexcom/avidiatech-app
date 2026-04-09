"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CaptureResult {
  name: string;
  brand: string;
  sku: string;
  price: string;
  url: string;
  images: string[];
  specs: Record<string, string>;
  manuals: string[];
  capturedAt: string;
}

interface HistoryItem extends CaptureResult {
  id: string;
  sentToAvidia: boolean;
}

// ─── Sample captures ──────────────────────────────────────────────────────────
const MOCK_CAPTURES: Record<string, CaptureResult> = {
  "https://medline.com/products/skil-care-mattress-overlay": {
    name: "Skil-Care Foam Pressure Redistribution Mattress Overlay",
    brand: "Skil-Care",
    sku: "SKC-MO-4-80",
    price: "$89.99",
    url: "https://medline.com/products/skil-care-mattress-overlay",
    images: ["main", "detail", "packaging"],
    specs: { Dimensions: "80 × 35 × 4 in", Material: "Convoluted foam", "Cover type": "Waterproof nylon", Weight: "4.2 lbs" },
    manuals: ["Care instructions (PDF)", "Infection control guide (PDF)"],
    capturedAt: new Date().toISOString(),
  },
  "https://example.com": {
    name: "Example Medical Device",
    brand: "ExampleCo",
    sku: "EXC-001",
    price: "$199.00",
    url: "https://example.com",
    images: ["main", "alt"],
    specs: { Weight: "2.3 kg", Dimensions: "30 × 20 × 10 cm", Voltage: "120V" },
    manuals: ["User manual (PDF)"],
    capturedAt: new Date().toISOString(),
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BrowserPage() {
  const [url, setUrl] = useState("https://medline.com/products/skil-care-mattress-overlay");
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function capture() {
    if (!url.trim()) return;
    setCapturing(true);
    setResult(null);
    setError(null);
    await new Promise((r) => setTimeout(r, 1300));

    // Find matching mock or use generic
    const matchKey = Object.keys(MOCK_CAPTURES).find((k) => url.toLowerCase().includes(k.replace("https://", "").split("/")[0]));
    const data = matchKey ? MOCK_CAPTURES[matchKey] : {
      ...MOCK_CAPTURES["https://example.com"],
      url,
      capturedAt: new Date().toISOString(),
    };
    setResult(data);
    setCapturing(false);
  }

  function sendToAvidia() {
    if (!result) return;
    const item: HistoryItem = { ...result, id: `cap-${Date.now()}`, sentToAvidia: true };
    setHistory((prev) => [item, ...prev.slice(0, 9)]);
    showToast(`"${result.name}" sent to AvidiaExtract.`);
  }

  function downloadJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.sku || "capture"}.json`;
    a.click();
    showToast("JSON downloaded.");
  }

  function downloadCSV() {
    if (!result) return;
    const rows = Object.entries(result.specs).map(([k, v]) => `"${k}","${v}"`);
    const csv = ["Key,Value", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.sku || "capture"}-specs.csv`;
    a.click();
    showToast("CSV downloaded.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-300/28 blur-3xl dark:bg-violet-500/28" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/20" />
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
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
            Developer Tools · AvidiaBrowser
          </div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
            Capture product data{" "}
            <span className="bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent dark:from-violet-300 dark:via-sky-200 dark:to-emerald-200">
              without leaving the page.
            </span>
          </h1>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Paste any product page URL below to extract structured data. In the browser extension, this happens with one click while you browse.
          </p>
        </section>

        {/* Capture input */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Product page capture</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && capture()}
                placeholder="https://manufacturer.com/product/..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={capture}
              disabled={capturing || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/40 transition hover:-translate-y-px hover:bg-violet-400 disabled:opacity-60"
            >
              {capturing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Capturing…
                </>
              ) : "Capture"}
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Try: <button onClick={() => setUrl("https://medline.com/products/skil-care-mattress-overlay")} className="text-violet-500 underline underline-offset-2">medline.com sample</button>
          </p>
        </div>

        {/* Results + history */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* LEFT: capture result */}
          <div>
            {!result && !capturing && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
                <span className="text-4xl">🔍</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No capture yet</p>
                <p className="text-[11px] text-slate-500">Paste a product URL above and click Capture.</p>
              </div>
            )}

            {capturing && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-12 text-center dark:border-slate-800">
                <svg className="h-8 w-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-600 dark:text-slate-300">Extracting product data…</p>
              </div>
            )}

            {result && !capturing && (
              <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85 overflow-hidden">
                {/* Product header */}
                <div className="border-b border-slate-100 bg-violet-50/60 px-5 py-4 dark:border-slate-800 dark:bg-violet-500/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{result.brand} · {result.sku}</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">{result.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{result.price}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Captured
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Specs */}
                  <div>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Specifications</h4>
                    <div className="divide-y divide-slate-50 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                      {Object.entries(result.specs).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">{k}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Images ({result.images.length})</h4>
                    <div className="flex gap-2">
                      {result.images.map((img, i) => (
                        <div key={i} className="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 capitalize">{img}</div>
                      ))}
                    </div>
                  </div>

                  {/* Manuals */}
                  {result.manuals.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Documents</h4>
                      <ul className="space-y-1 text-[11px]">
                        {result.manuals.map((m) => (
                          <li key={m} className="text-violet-600 underline underline-offset-2 dark:text-violet-400">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button onClick={sendToAvidia} className="inline-flex flex-1 items-center justify-center rounded-full bg-violet-500 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-400">
                      Send to AvidiaExtract
                    </button>
                    <button onClick={downloadJSON} className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      Download JSON
                    </button>
                    <button onClick={downloadCSV} className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      Download CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: history + info */}
          <div className="space-y-4">
            {/* Capture history */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Capture history</h2>
              {history.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Captures sent to Avidia will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950/70">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.brand} · {item.sku}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extension info */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Chrome extension</h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                The AvidiaBrowser Chrome extension puts this capture panel on any product page you visit. One click captures title, specs, images, and documents — then sends them to your Avidia workspace automatically.
              </p>
              <div className="mt-3 space-y-1.5 text-[11px]">
                {["Install Chrome extension", "Log in with AvidiaTech account", "Browse any product page", "Click Capture → Send to Avidia"].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{i + 1}</span>
                    <span className="text-slate-600 dark:text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full rounded-lg border border-violet-300/60 bg-violet-50 py-2 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">
                Join extension waitlist →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
