"use client";

import React, { useEffect, useState } from "react";

type TranslateProduct = {
  id: string;
  source_url?: string;
  name?: string;
  created_at?: string;
  translated_languages?: string[];
  source_language?: string;
};

export const dynamic = "force-dynamic";

export default function TranslateListPage() {
  const [products, setProducts] = useState<TranslateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/translate/list")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load translations");
        return r.json();
      })
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch(() => {
        setError("We couldn’t load your recent translations. Try refreshing the page.");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = products.length;
  const totalLanguages = Array.from(
    new Set(
      products.flatMap((p) => p.translated_languages || [])
    )
  ).length;

  const formatDate = (value?: string) => {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8 lg:py-10">
        {/* HEADER / HERO STRIP */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-sky-100 ring-1 ring-white/10">
              <span className="rounded-full bg-sky-500/25 px-2 py-0.5 text-[11px] uppercase tracking-wide text-sky-100">
                Module
              </span>
              <span>AvidiaTranslate · Multilingual product catalogs</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Translate your entire catalog without breaking{" "}
                <span className="bg-gradient-to-r from-sky-300 via-fuchsia-300 to-emerald-200 bg-clip-text text-transparent">
                  structure, SEO, or compliance.
                </span>
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-slate-200">
                AvidiaTranslate takes your structured product data from AvidiaExtract and AvidiaDescribe, then localizes
                names, descriptions, and key attributes—keeping specs intact and SEO signals aligned across languages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <a
                href="/dashboard/extract"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
              >
                Start from Extracted Products
              </a>
              <a
                href="/dashboard/translate/new"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-slate-50 hover:border-white/40 hover:bg-white/5"
              >
                Create New Translation Job
              </a>
              <p className="text-slate-400">
                Plug in any supported language pair. AvidiaTech handles the routing and audit trail.
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-sky-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Translation workspace · Snapshot
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-400">Products with translations</p>
                  <p className="text-lg font-semibold text-slate-50">{totalProducts}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
                  Live queue
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-400">Languages covered</p>
                  <p className="text-lg font-semibold text-slate-50">
                    {totalLanguages > 0 ? totalLanguages : "--"}
                  </p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs text-sky-200">
                  Multi-region
                </span>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-sky-500/15 via-fuchsia-500/10 to-emerald-500/10 px-4 py-3 text-xs text-slate-100">
                Keep your canonical specs in one place, while AvidiaTranslate maintains language-specific titles and
                descriptions that still map cleanly back to each SKU.
              </div>
            </div>
          </div>
        </section>

        {/* BODY: LEFT = LIST, RIGHT = EXPLANATION */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          {/* LEFT: RECENT TRANSLATIONS TABLE / CARDS */}
          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent translation jobs</h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Pick up where you left off, refine language pairs, or push localized copy to your store.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  In review
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800/60" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800/60" />
                <div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-800/60" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-300">
                <p className="font-medium text-slate-100">You don’t have any translation jobs yet.</p>
                <p className="mt-1">
                  Start from an extracted product in <span className="font-semibold text-sky-200">AvidiaExtract</span> or
                  create a new translation job to localize your first SKU.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/dashboard/extract"
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    View Extracted Products
                  </a>
                  <a
                    href="/dashboard/translate/new"
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-slate-50 hover:border-white/40 hover:bg-white/5"
                  >
                    Create Translation Job
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => {
                  const languages = p.translated_languages || [];
                  const sourceLabel =
                    p.source_language || (languages.length ? `Source + ${languages.length} locales` : "Source only");

                  return (
                    <a
                      key={p.id}
                      href={`/dashboard/translate/${p.id}`}
                      className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-sky-400/70 hover:bg-slate-900/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-50">
                            {p.name || p.source_url || `Job ${p.id}`}
                          </p>
                          <p className="text-xs text-slate-300">
                            {p.source_url ? (
                              <span className="truncate text-slate-300">{p.source_url}</span>
                            ) : (
                              <span className="text-slate-400">Created from product payload</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs">
                          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-slate-200">
                            {sourceLabel}
                          </span>
                          {languages.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              Locales: {languages.slice(0, 3).join(", ")}
                              {languages.length > 3 ? ` +${languages.length - 3}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Opened {formatDate(p.created_at)}</span>
                        <span>Click to open translation workspace</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: HOW IT WORKS / LANGUAGES */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">How AvidiaTranslate fits into the pipeline</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold text-sky-200">1. Start from Extract</p>
                  <p className="mt-1 text-xs sm:text-sm">
                    Use AvidiaExtract to ingest manufacturer URLs. You get a clean, structured payload with titles, specs,
                    manuals, and media.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold text-fuchsia-200">2. Apply your language strategy</p>
                  <p className="mt-1 text-xs sm:text-sm">
                    AvidiaTranslate localizes key fields (name, short name, description, meta) according to your rules
                    while preserving technical details and measurements.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold text-emerald-200">3. Sync to channels</p>
                  <p className="mt-1 text-xs sm:text-sm">
                    Push language-specific variants into your storefronts, feeds, or PIM via the same JSON schema used by
                    other Avidia modules.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <h3 className="text-base font-semibold text-white">What this module gives you</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li>• Centralized control of languages per tenant and per product line.</li>
                <li>• Translation jobs that stay in sync with updates from vendors and Extract.</li>
                <li>• Audit trail for who triggered which language updates and when.</li>
                <li>• Consistent formatting and internal linking rules across locales.</li>
              </ul>

              <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Typical language setup
              </h4>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full bg-white/10 px-3 py-1">English → Spanish (US / LATAM)</span>
                <span className="rounded-full bg-white/10 px-3 py-1">English → French (CA / EU)</span>
                <span className="rounded-full bg-white/10 px-3 py-1">English → German</span>
                <span className="rounded-full bg-white/10 px-3 py-1">English → Arabic</span>
                <span className="rounded-full bg-white/10 px-3 py-1">English → Portuguese (BR)</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Actual language support depends on your configuration and plan. Use this area later to connect to your
                translation provider or LLM of choice.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
