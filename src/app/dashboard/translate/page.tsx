"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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
        setError(
          "We couldn’t load your recent translations. Try refreshing the page."
        );
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = products.length;
  const totalLanguages = Array.from(
    new Set(products.flatMap((p) => p.translated_languages || []))
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
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background / grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/25" />
        <div className="absolute -bottom-32 right-[-8rem] h-72 w-72 rounded-full bg-fuchsia-400/16 blur-3xl dark:bg-fuchsia-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.96)_40%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      {/* Wrapper aligned with Describe page (starts higher, unified padding) */}
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HEADER / HERO */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/90 px-4 py-1.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-200 dark:bg-white/5 dark:text-sky-100 dark:ring-white/10">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-sky-700 dark:bg-sky-500/25 dark:text-sky-100">
                Module
              </span>
              <span>AvidiaTranslate · Multilingual product catalogs</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl text-slate-900 dark:text-slate-50">
                Translate your entire catalog without breaking{" "}
                <span className="bg-gradient-to-r from-sky-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent dark:from-sky-300 dark:via-fuchsia-300 dark:to-emerald-200">
                  structure, SEO, or compliance.
                </span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-200">
                AvidiaTranslate localizes names, descriptions, and key attributes
                from AvidiaExtract and AvidiaDescribe while preserving structured
                specs and SEO signals across languages.
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <Link
                href="/dashboard/translate/new"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-slate-50 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
              >
                Create New Translation Job
              </Link>
              <Link
                href="/dashboard/extract"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/70 px-5 py-2.5 font-semibold text-slate-900 hover:border-sky-300 hover:bg-sky-50 dark:border-white/20 dark:bg-transparent dark:text-slate-50 dark:hover:border-white/40 dark:hover:bg-white/5"
              >
                Start from Extracted Products
              </Link>
              <p className="max-w-xs text-slate-500 dark:text-slate-400">
                Plug in any supported language pair. AvidiaTech handles routing,
                consistency, and audit trails in the background.
              </p>
            </div>
          </div>

          {/* Snapshot card */}
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md shadow-slate-200/40 backdrop-blur-sm dark:border-white/12 dark:bg-slate-950/80 dark:shadow-xl dark:shadow-sky-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Translation workspace · Snapshot
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Products with translations
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {totalProducts}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Live queue
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Languages covered
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {totalLanguages > 0 ? totalLanguages : "--"}
                  </p>
                </div>
                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                  Multi-region
                </span>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-sky-100 via-fuchsia-100 to-emerald-100 px-4 py-3 text-xs text-slate-800 dark:from-sky-500/15 dark:via-fuchsia-500/10 dark:to-emerald-500/10 dark:text-slate-100">
                Keep canonical specs in one place while AvidiaTranslate maintains
                language-specific titles and descriptions that map cleanly to each
                SKU.
              </div>

              {/* Quick start language presets (UI stub, ready to wire later) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-xs dark:border-white/10 dark:bg-slate-950/60">
                <p className="mb-2 font-semibold text-slate-800 dark:text-slate-100">
                  Quick start
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                  >
                    EN → ES (US / LATAM)
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-800 dark:bg-white/10 dark:text-slate-100"
                  >
                    EN → FR (CA / EU)
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-800 dark:bg-white/10 dark:text-slate-100"
                  >
                    EN → DE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: LEFT = LIST, RIGHT = EXPLANATION */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr),minmax(320px,0.9fr)]">
          {/* LEFT: RECENT TRANSLATIONS */}
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-sm shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recent translation jobs
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-300">
                  Pick up where you left off, refine language pairs, or push
                  localized copy to your store.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                {/* Filter stub (non-functional for now, but ready) */}
                <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 sm:flex">
                  <span className="mr-1 text-slate-500 dark:text-slate-400">
                    Filter:
                  </span>
                  <button
                    type="button"
                    className="mr-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="text-[11px] text-slate-500 dark:text-slate-400"
                  >
                    Last 7 days
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    Completed
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                    In review
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/60" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/60" />
                <div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/60" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  You don’t have any translation jobs yet.
                </p>
                <p className="mt-1">
                  Start from an extracted product in{" "}
                  <span className="font-semibold text-sky-700 dark:text-sky-200">
                    AvidiaExtract
                  </span>{" "}
                  or create a new translation job to localize your first SKU.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/extract"
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-50 hover:bg-sky-400"
                  >
                    View Extracted Products
                  </Link>
                  <Link
                    href="/dashboard/translate/new"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-900 hover:border-sky-300 hover:bg-sky-50 dark:border-white/20 dark:bg-transparent dark:text-slate-50 dark:hover:border-white/40 dark:hover:bg-white/5"
                  >
                    Create Translation Job
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => {
                  const languages = p.translated_languages || [];
                  const sourceLabel =
                    p.source_language ||
                    (languages.length
                      ? `Source + ${languages.length} locales`
                      : "Source only");

                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/translate/${p.id}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-400/70 hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-slate-900/80"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {p.name || p.source_url || `Job ${p.id}`}
                          </p>
                          <p className="max-w-full truncate text-xs text-slate-500 dark:text-slate-300">
                            {p.source_url ? (
                              <span>{p.source_url}</span>
                            ) : (
                              <span className="text-slate-400">
                                Created from product payload
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-950/80 dark:text-slate-200">
                            {sourceLabel}
                          </span>
                          {languages.length > 0 && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Locales: {languages.slice(0, 3).join(", ")}
                              {languages.length > 3
                                ? ` +${languages.length - 3}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Opened {formatDate(p.created_at)}</span>
                        <span>Open translation workspace →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: PIPELINE EXPLANATION */}
          <div className="space-y-4 self-start lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-sm shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                How AvidiaTranslate fits into the pipeline
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="rounded-2xl bg-sky-50 p-3 dark:bg-slate-950/80">
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-200">
                    1. Start from Extract
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Use AvidiaExtract to ingest manufacturer URLs. You get a
                    clean, structured payload with titles, specs, manuals, and
                    media.
                  </p>
                </div>
                <div className="rounded-2xl bg-fuchsia-50 p-3 dark:bg-slate-950/80">
                  <p className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-200">
                    2. Apply your language strategy
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    AvidiaTranslate localizes key fields (name, short name,
                    description, meta) according to your rules while preserving
                    technical details and measurements.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-slate-950/80">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                    3. Sync to channels
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Push language-specific variants into your storefronts,
                    feeds, or PIM via the same JSON schema used by other Avidia
                    modules.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 backdrop-blur-sm shadow-sm dark:border-white/10 dark:bg-slate-950/80">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                What this module gives you
              </h3>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                <li>• Centralized control of languages per tenant and product.</li>
                <li>• Translation jobs that stay in sync with Extract updates.</li>
                <li>• Audit trail for who triggered which language updates.</li>
                <li>
                  • Consistent formatting and internal linking rules across
                  locales.
                </li>
              </ul>

              <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Typical language setup
              </h4>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-800 dark:text-slate-100">
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">
                  English → Spanish (US / LATAM)
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">
                  English → French (CA / EU)
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">
                  English → German
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">
                  English → Arabic
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">
                  English → Portuguese (BR)
                </span>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Actual language support depends on your configuration and plan.
                Later, this panel can hook into your translation provider or LLM
                settings for each tenant.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
