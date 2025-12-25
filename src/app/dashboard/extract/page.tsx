// src/app/dashboard/extract/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import TabsShell from "@/components/TabsShell";
import JsonViewer from "@/components/JsonViewer";
import { useIngestRow } from "@/hooks/useIngestRow";
import ExtractHeader from "@/components/ExtractHeader";

/**
 * AvidiaExtract page (client)
 *
 * - ExtractHeader calls onJobCreated(jobId, url) after POST /api/v1/ingest.
 * - We track jobId so the status + SEO button can work.
 * - Preview comes from: GET /api/v1/ingest/{jobId}?url=<url>
 *   which proxies to medx-ingest-api when ?url is present.
 * - For display we:
 *   - Prefer preview JSON.
 *   - Fall back to DB row (normalized_payload if available).
 */

export const dynamic = "force-dynamic";

export default function ExtractPage() {
  const router = useRouter();

  // submission / job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobUrl, setJobUrl] = useState<string | null>(null);
  const { row, loading: rowLoading, error: rowError } = useIngestRow(
    jobId,
    1500
  );

  // preview state when the synchronous GET returns extraction immediately
  const [preview, setPreview] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Helper to normalize shapes like:
  // - { ok, data: { normalized_payload, ... } }
  // - { normalized_payload, ... }
  // - plain job row
  function extractPayload(source: any | null | undefined) {
    if (!source) return null;

    const base = source.data ?? source;
    return base.normalized_payload ?? base;
  }

  // derive payload for highlights preferring preview -> row
  const payload = useMemo(() => {
    if (preview) return extractPayload(preview);
    if (row) return extractPayload(row);
    return null;
  }, [preview, row]);

  const name = payload?.name_best ?? payload?.name_raw ?? payload?.name;
  const featuresHtml =
    payload?.features_html ??
    payload?.features_structured ??
    payload?.features_raw;
  const pdfUrls =
    payload?.pdf_manual_urls ?? payload?.pdfs ?? payload?.manuals ?? [];
  const images = payload?.images ?? [];
  const quality = payload?.quality_score;
  const needsReview = payload?.needs_review;

  function onJobCreated(id: string, url: string) {
    setJobId(String(id));
    setJobUrl(url);
    setPreview(null);
    setPreviewError(null);

    // scroll to results area
    setTimeout(() => {
      const el = document.getElementById("extract-results");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  // When jobId + jobUrl set, call:
  //   GET /api/v1/ingest/{jobId}?url=<encoded>
  useEffect(() => {
    if (!jobId || !jobUrl) return;

    let mounted = true;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const target = `/api/v1/ingest/${encodeURIComponent(
          jobId
        )}?url=${encodeURIComponent(jobUrl)}`;

        const res = await fetch(target, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        const text = await res.text().catch(() => "");

        if (!mounted) return;

        if (!res.ok) {
          let message = `preview fetch failed (${res.status})`;
          try {
            const j = JSON.parse(text || "{}");
            message = j?.error || message;
          } catch {
            // keep default message
          }
          setPreviewError(message);
          setPreviewLoading(false);
          return;
        }

        // Try parse JSON
        try {
          const j = JSON.parse(text || "{}");
          setPreview(j);
        } catch {
          setPreviewError("Preview returned non-JSON response");
        }
      } catch (err: any) {
        if (!mounted) return;
        setPreviewError(String(err?.message || err));
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [jobId, jobUrl]);

  // For the JSON viewer, prefer normalized preview data, then row
  const jsonViewerData = useMemo(() => {
    if (preview) return extractPayload(preview) ?? preview;
    if (row) return extractPayload(row) ?? row;
    return {};
  }, [preview, row]);

  const ingestionStatus = row?.status ?? (preview ? "preview-only" : null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* BACKGROUND: layered gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      {/* Wrapper aligned with Describe/Translate (starts higher) */}
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HERO: prioritize launcher (input) first */}
        <section className="relative grid gap-6 lg:grid-cols-[minmax(0,460px),minmax(0,1fr)] lg:items-start">
          {/* FIRST: ExtractHeader inside a "launcher" card (sticky on desktop) */}
          <div className="order-1">
            <div className="lg:sticky lg:top-6">
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-xl shadow-slate-200/60 dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_0_50px_rgba(15,23,42,0.95)]">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Extract launcher
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Submit a manufacturer URL; AvidiaExtract handles the rest.
                    </p>
                  </div>
                  {jobId && (
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Current job
                      </p>
                      <p className="font-mono text-[10px] text-cyan-700 dark:text-cyan-200">
                        {jobId.slice(0, 10)}…
                      </p>
                    </div>
                  )}
                </div>
                <div className="min-h-[220px] flex-1">
                  <ExtractHeader onJobCreated={onJobCreated} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">
                    Extraction response is streamed into both the human view and
                    the JSON viewer below.
                  </p>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    {rowLoading || previewLoading ? "Pipeline running…" : "Idle"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECOND: headline + story + status chips */}
          <div className="order-2 min-w-[260px] flex-1 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/70 bg-white/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-800 shadow-sm dark:border-cyan-500/60 dark:bg-slate-950/90 dark:text-cyan-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400/70 bg-slate-100 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500 dark:bg-cyan-400" />
                </span>
                AvidiaTech • AvidiaExtract
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Ingest engine • JSON-first
              </span>
              {ingestionStatus && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                  Status:
                  <span className="font-mono text-[10px] uppercase text-cyan-700 dark:text-cyan-200">
                    {ingestionStatus}
                  </span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                Extract everything from a{" "}
                <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-400 dark:to-emerald-300">
                  single manufacturer URL
                </span>{" "}
                — as clean, normalized JSON.
              </h1>
              <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                Paste any product URL. AvidiaExtract hits your ingest engine,
                strips noise, standardizes specs, and streams back a
                JSON-first view that plugs into SEO, Describe, and any
                ecommerce stack.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-200 bg-white/90 px-3 py-3 text-[11px] text-slate-700 shadow-sm dark:border-cyan-500/40 dark:bg-slate-950/90 dark:text-slate-100">
                <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-200">
                  Example extraction
                </p>
                <p className="leading-relaxed">
                  Unified JSON with name, brand, attributes, features, manuals,
                  images, and normalized specs — ready for any downstream module.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 text-[11px] text-slate-700 shadow-sm dark:border-emerald-400/50 dark:bg-slate-950/90 dark:text-slate-100">
                <p className="mb-1 font-semibold text-emerald-700 dark:text-emerald-300">
                  Feeds the stack
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>AvidiaDescribe for copy-first flows</li>
                  <li>AvidiaSEO for URL-first SEO pages</li>
                  <li>Any external store / PIM as JSON</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px]">
              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-50">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-cyan-400/70 bg-cyan-500/10 text-[12px] text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                  1
                </div>
                <div className="space-y-0">
                  <p className="font-semibold">Opinionated normalization</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Features, manuals, images, and specs are shaped into a
                    predictable schema.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-50">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/10 text-[12px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                  2
                </div>
                <div className="space-y-0">
                  <p className="font-semibold">Debuggable at every step</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Human preview, Tabs, and JSON viewer all stay in sync with
                    the ingest engine.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-50">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-emerald-400/70 bg-emerald-500/10 text-[12px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                  3
                </div>
                <div className="space-y-0">
                  <p className="font-semibold">Built for the rest of Avidia</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    One ingestion layer powering AvidiaDescribe, AvidiaSEO,
                    and any custom exporter.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-white/90 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm dark:border-cyan-400/50 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                  Step 1
                </span>
                <span>
                  Use the{" "}
                  <span className="font-semibold text-cyan-700 dark:text-cyan-200">
                    Extract launcher
                  </span>{" "}
                  below to submit a URL.
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Step 2
                </span>
                <span>
                  Inspect the extraction canvas and JSON viewer in real time.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN: Extraction canvas + JSON viewer */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)]">
          {/* LEFT: human extraction canvas */}
          <section className="flex min-h-[520px] flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-2xl dark:shadow-slate-950/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Extraction canvas
                </h2>
                <p className="mt-1 max-w-xl text-[11px] text-slate-600 dark:text-slate-400">
                  A human-readable view of the current extraction. Preview
                  reflects the ingest engine directly; Tabs under this section
                  expose raw and normalized variants from your DB.
                </p>
              </div>
              {jobId && (
                <div className="ml-auto flex flex-col items-end gap-1">
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/seo?ingestionId=${encodeURIComponent(
                          jobId
                        )}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-lg shadow-cyan-500/30 transition-transform hover:-translate-y-[1px] hover:bg-cyan-400 dark:text-slate-950"
                  >
                    <span>Send to AvidiaSEO</span>
                    <span className="text-[13px]">↗</span>
                  </button>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">
                    Reuses this ingestionId downstream.
                  </p>
                </div>
              )}
            </div>

            {/* Status strip */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    rowLoading || previewLoading
                      ? "bg-amber-400 animate-pulse"
                      : payload
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : "bg-slate-400"
                  }`}
                />
                <span>
                  {rowLoading || previewLoading
                    ? "Fetching extraction preview…"
                    : payload
                    ? "Extraction ready"
                    : "Awaiting first URL"}
                </span>
              </div>
              {rowError && (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/80 dark:text-rose-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                  DB error: {String(rowError)}
                </span>
              )}
              {previewError && !previewLoading && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/80 dark:text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Preview: {previewError}
                </span>
              )}
            </div>

            {/* Human preview block */}
            <div className="mt-1">
              {previewLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-full border-2 border-cyan-400/50 border-t-transparent animate-spin" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      Loading preview from ingest engine…
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      This hits the medx-ingest-api directly; tabs and JSON
                      viewer will update as soon as it returns.
                    </p>
                  </div>
                </div>
              ) : previewError && !payload ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-50">
                  Preview error: {previewError}
                </div>
              ) : payload ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/90">
                  {/* SINGLE-COLUMN PREVIEW BLOCK, IMAGES BEFORE MANUALS */}
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {name ?? "Untitled extraction"}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                    {quality !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700 shadow-sm dark:border-emerald-400/40 dark:bg-slate-900/90 dark:text-emerald-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        Quality score:{" "}
                        <span className="font-semibold">{quality}</span>
                      </span>
                    )}
                    {needsReview !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-700 shadow-sm dark:border-amber-400/40 dark:bg-slate-900/90 dark:text-amber-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Needs manual review:{" "}
                        <span className="font-semibold">
                          {String(Boolean(needsReview))}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Features (preview)
                    </p>
                    {Array.isArray(featuresHtml) ? (
                      <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-slate-700 dark:text-slate-200">
                        {featuresHtml.slice(0, 10).map((f: any, i: number) => (
                          <li key={i} className="list-disc list-inside">
                            {typeof f === "string" ? f : JSON.stringify(f)}
                          </li>
                        ))}
                        {featuresHtml.length > 10 && (
                          <li className="text-slate-400">…truncated</li>
                        )}
                      </ul>
                    ) : typeof featuresHtml === "string" ? (
                      <p className="mt-2 line-clamp-5 text-xs text-slate-700 dark:text-slate-200">
                        {featuresHtml}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        No features extracted yet.
                      </p>
                    )}
                  </div>

                  {/* Images FIRST */}
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Images
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.isArray(images) && images.length > 0 ? (
                        images.slice(0, 8).map((img: any, i: number) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img?.url ?? img}
                            alt={`img-${i}`}
                            className="h-20 w-full rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-900"
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-xs text-slate-400 dark:text-slate-500">
                          No images detected.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manuals / PDFs AFTER images */}
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Manuals &amp; PDFs
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(pdfUrls) && pdfUrls.length > 0 ? (
                        pdfUrls.slice(0, 8).map((u: string, i: number) => (
                          <a
                            key={i}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-[11px] text-cyan-800 shadow-sm hover:border-cyan-400 hover:text-cyan-900 dark:border-cyan-400/40 dark:bg-slate-900/90 dark:text-cyan-200 dark:hover:border-cyan-300"
                          >
                            <span className="text-[13px]">📄</span>
                            <span>PDF {i + 1}</span>
                          </a>
                        ))
                      ) : (
                        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                          No manuals or PDFs found.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
                  Submit a product URL using the Extract launcher. AvidiaExtract
                  will display a human-friendly preview here and a full JSON
                  view on the right.
                </div>
              )}
            </div>

            {/* TabsShell: anchored block for raw data */}
            <div className="mt-2" id="extract-results">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Ingest row &amp; raw views
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tabs expose different slices of the same ingest row
                    (normalized, raw HTML, logs, etc) to help you debug.
                  </p>
                </div>
              </div>
              <TabsShell
                job={row}
                loading={rowLoading}
                error={rowError}
                noDataMessage="Submit a URL to extract raw data"
              />
            </div>
          </section>

          {/* RIGHT: JSON viewer card */}
          <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-2xl dark:shadow-slate-950/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Normalized JSON viewer
                </h2>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  The exact payload your automations consume. Preferentially
                  shows the normalized preview; falls back to the DB row when
                  needed.
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  {jobId ? (
                    <>
                      Job:{" "}
                      <span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-200">
                        {jobId.slice(0, 10)}…
                      </span>
                    </>
                  ) : (
                    "No job yet"
                  )}
                </div>
                <div className="mt-1">
                  {row?.status ? `Status: ${row.status}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/90">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] dark:border-slate-800">
                <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Payload explorer
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  {preview
                    ? "Preview • normalized"
                    : row
                    ? "DB row • normalized"
                    : "Awaiting first extraction"}
                </span>
              </div>
              <div className="h-full max-h-[460px] overflow-auto">
                <JsonViewer
                  data={jsonViewerData}
                  loading={!row && !!jobId && !preview}
                />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
