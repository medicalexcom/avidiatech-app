"use client";
import React, { useCallback, useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/translate/languageMap";

type TranslationPayload = Record<string, { name?: string; description_html?: string; features?: string[]; specs?: Record<string, string> }>;

const ALL_FIELDS = [
  { id: "name", label: "Product name" },
  { id: "description_html", label: "Description" },
  { id: "features", label: "Key features" },
  { id: "specs", label: "Spec labels" },
] as const;

function LanguageChip({ code, label, selected, onChange }: { code: string; label: string; selected: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!selected)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-sky-400 bg-sky-100 text-sky-700 dark:border-sky-500/50 dark:bg-sky-950/60 dark:text-sky-300"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
      }`}
    >
      {label}
    </button>
  );
}

export default function TranslateWorkspace({ params }: { params: { productId: string } }) {
  const productId = params.productId;
  const [product, setProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["es", "fr"]);
  const [selectedFields, setSelectedFields] = useState<string[]>(["name", "description_html"]);
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<TranslationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setLoadingProduct(true);
    fetch(`/api/translate/product?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => setProduct(d.product ?? null))
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoadingProduct(false));
  }, [productId]);

  async function runTranslate() {
    if (!selectedLangs.length || !selectedFields.length) return;
    setError(null);
    setTranslations(null);
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, languages: selectedLangs, fields: selectedFields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "translation_failed");
      setTranslations(json.translations ?? null);
      showToast(`Translated into ${selectedLangs.length} language${selectedLangs.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      setError(err?.message ?? "network_error");
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    if (!translations) return;
    const blob = new Blob([JSON.stringify(translations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productId}-translations.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON downloaded");
  }

  function toggleLang(code: string) {
    setSelectedLangs((prev) => prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]);
  }

  function toggleField(id: string) {
    setSelectedFields((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute bottom-0 right-[-8rem] h-72 w-72 rounded-full bg-violet-300/18 blur-3xl dark:bg-violet-500/12" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              AvidiaTranslate · Product
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Translate Product</h1>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-600">{productId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportJson}
              disabled={!translations}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Export JSON
            </button>
            <button
              onClick={runTranslate}
              disabled={loading || !product || !selectedLangs.length || !selectedFields.length}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {loading ? "Translating…" : "Run Translation"}
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Left: controls + source */}
          <div className="space-y-4">
            {/* Source product */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Source product (EN)</p>
              </div>
              <div className="px-5 py-4">
                {loadingProduct ? (
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800" />
                    <div className="h-4 w-full rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800" />
                    <div className="h-4 w-2/3 rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800" />
                  </div>
                ) : !product ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Product not found</p>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{product.name_raw || "(no name)"}</p>
                    {product.description_html || product.description_raw ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: product.description_html || product.description_raw || "" }}
                      />
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-600">(No description)</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Language selection */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-3">Target languages</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGUAGES.map((l: { code: string; label: string }) => (
                  <LanguageChip
                    key={l.code}
                    code={l.code}
                    label={l.label}
                    selected={selectedLangs.includes(l.code)}
                    onChange={() => toggleLang(l.code)}
                  />
                ))}
              </div>
              {selectedLangs.length === 0 && (
                <p className="mt-2 text-[11px] text-rose-500 dark:text-rose-400">Select at least one language</p>
              )}
            </div>

            {/* Field selection */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-3">Fields to translate</p>
              <div className="space-y-2">
                {ALL_FIELDS.map((f) => (
                  <label key={f.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(f.id)}
                      onChange={() => toggleField(f.id)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: results */}
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-950/30">
                <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 py-12 dark:border-sky-500/20 dark:bg-sky-950/20">
                <svg className="animate-spin h-6 w-6 text-sky-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-sm text-sky-700 dark:text-sky-300">Translating into {selectedLangs.length} language{selectedLangs.length > 1 ? "s" : ""}…</p>
              </div>
            )}

            {!loading && !translations && !error && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-600">
                <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <p className="text-sm">Select languages and fields, then run translation</p>
              </div>
            )}

            {translations && (
              <div className="space-y-3">
                {Object.entries(translations).map(([lang, payload]) => {
                  const langLabel = SUPPORTED_LANGUAGES.find((l: { code: string; label: string }) => l.code === lang)?.label ?? lang.toUpperCase();
                  return (
                    <div key={lang} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{langLabel}</p>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 px-5">
                        {payload.name && (
                          <div className="py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 mb-1">Name</p>
                            <p className="text-sm text-slate-800 dark:text-slate-100">{payload.name}</p>
                          </div>
                        )}
                        {payload.description_html && (
                          <div className="py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 mb-1">Description</p>
                            <div
                              className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300"
                              dangerouslySetInnerHTML={{ __html: payload.description_html }}
                            />
                          </div>
                        )}
                        {payload.features && payload.features.length > 0 && (
                          <div className="py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 mb-1">Key features</p>
                            <ul className="space-y-1">
                              {payload.features.map((f, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
