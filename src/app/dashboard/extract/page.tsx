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

  const name =
    payload?.name_best ?? payload?.name_raw ?? payload?.name;
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
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* BACKGROUND: layered gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* HERO: Extract identity + ExtractHeader */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/35 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_120px_rgba(56,189,248,0.35)] px-5 py-6 lg:px-7 lg:py-7">
          {/* floating cards on the right */}
          <div className="pointer-events-none absolute -right-4 -top-4 hidden xl:block">
            <div className="rounded-2xl border border-cyan-400/40 bg-slate-950/95 shadow-[0_0_50px_rgba(56,189,248,0.55)] px-4 py-3 w-64 rotate-3">
              <p className="text-[11px] text-cyan-200 uppercase tracking-[0.18em] mb-1">
                Example extraction
              </p>
              <p className="text-[11px] text-slate-100 leading-relaxed">
                Unified JSON with name, brand, attributes, features, manuals,
                images, and normalized specs — ready for any downstream module.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 bottom-4 hidden xl:block">
            <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/95 shadow-[0_0_50px_rgba(16,185,129,0.55)] px-4 py-3 w-64 -rotate-2">
              <p className="text-[11px] text-emerald-300 font-semibold mb-1">
                Feeds the stack
              </p>
              <ul className="text-[11px] text-slate-100 space-y-1 list-disc list-inside">
                <li>AvidiaDescribe for copy-first flows</li>
                <li>AvidiaSEO for URL-first SEO pages</li>
                <li>Any external store / PIM as JSON</li>
              </ul>
            </div>
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch">
            {/* LEFT: headline + story + status chips */}
            <div className="flex-1 min-w-[260px] space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/60 bg-slate-950/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-cyan-400/70">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  </span>
                  AvidiaTech • AvidiaExtract
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Ingest engine • JSON-first
                </span>
                {ingestionStatus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300">
                    Status:
                    <span className="font-mono text-[10px] uppercase text-cyan-200">
                      {ingestionStatus}
                    </span>
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-semibold leading-tight text-slate-50">
                  Extract everything from a{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300">
                    single manufacturer URL
                  </span>{" "}
                  — as clean, normalized JSON.
                </h1>
                <p className="text-sm text-slate-300 max-w-xl">
                  Paste any product URL. AvidiaExtract hits your ingest engine,
                  strips noise, standardizes specs, and streams back a
                  JSON-first view that plugs into SEO, Describe, and any
                  ecommerce stack.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-cyan-500/15 border border-cyan-400/70 flex items-center justify-center text-[12px]">
                    1
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Opinionated normalization
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Features, manuals, images, and specs are shaped into a
                      predictable schema.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-sky-500/15 border border-sky-400/70 flex items-center justify-center text-[12px]">
                    2
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Debuggable at every step
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Human preview, Tabs, and JSON viewer all stay in sync with
                      the ingest engine.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-emerald-500/15 border border-emerald-400/70 flex items-center justify-center text-[12px]">
                    3
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Built for the rest of Avidia
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      One ingestion layer powering AvidiaDescribe, AvidiaSEO,
                      and any custom exporter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-400/50 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-cyan-200 uppercase tracking-[0.16em]">
                    Step 1
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Use the{" "}
                    <span className="font-semibold text-cyan-200">
                      Extract launcher
                    </span>{" "}
                    below to submit a URL.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-[0.16em]">
                    Step 2
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Inspect the extraction canvas and JSON viewer in real time.
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: ExtractHeader inside a "launcher" card */}
            <div className="w-full lg:w-[420px] xl:w-[440px] mt-4 lg:mt-0">
              <div className="h-full rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-[0_0_50px_rgba(15,23,42,0.95)] px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                      Extract launcher
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submit a manufacturer URL; AvidiaExtract handles the rest.
                    </p>
                  </div>
                  {jobId && (
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Current job</p>
                      <p className="text-[10px] font-mono text-cyan-200">
                        {jobId.slice(0, 10)}…
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ExtractHeader onJobCreated={onJobCreated} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-500">
                    Extraction response is streamed into both the human view and
                    the JSON viewer below.
                  </p>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {rowLoading || previewLoading ? "Pipeline running…" : "Idle"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN: Extraction canvas + JSON viewer */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)] gap-6">
          {/* LEFT: human extraction canvas */}
          <section className="rounded-3xl bg-slate-900/90 border border-slate-700/70 shadow-2xl shadow-slate-950/80 p-4 lg:p-5 min-h-[520px] flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Extraction canvas
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-transform hover:-translate-y-[1px]"
                  >
                    <span>Send to AvidiaSEO</span>
                    <span className="text-[13px]">↗</span>
                  </button>
                  <p className="text-[10px] text-slate-500">
                    Reuses this ingestionId downstream.
                  </p>
                </div>
              )}
            </div>

            {/* Status strip */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700 px-3 py-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    rowLoading || previewLoading
                      ? "bg-amber-400 animate-pulse"
                      : payload
                      ? "bg-emerald-400"
                      : "bg-slate-500"
                  }`}
                />
                <span className="text-slate-300">
                  {rowLoading || previewLoading
                    ? "Fetching extraction preview…"
                    : payload
                    ? "Extraction ready"
                    : "Awaiting first URL"}
                </span>
              </div>
              {rowError && (
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-950/80 border border-rose-500/40 px-3 py-1.5 text-rose-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  DB error: {String(rowError)}
                </span>
              )}
              {previewError && !previewLoading && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Preview: {previewError}
                </span>
              )}
            </div>

            {/* Human preview block */}
            <div className="mt-1">
              {previewLoading ? (
                <div className="p-4 rounded-2xl border border-slate-700 bg-slate-950/90 text-sm text-slate-300 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-cyan-500/40 border-t-transparent animate-spin" />
                  <div>
                    <p className="font-medium text-slate-100">
                      Loading preview from ingest engine…
                    </p>
                    <p className="text-[11px] text-slate-400">
                      This hits the medx-ingest-api directly; tabs and JSON
                      viewer will update as soon as it returns.
                    </p>
                  </div>
                </div>
              ) : previewError && !payload ? (
                <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/70 text-sm text-amber-50">
                  Preview error: {previewError}
                </div>
              ) : payload ? (
                <div className="border border-slate-700 rounded-2xl p-4 bg-slate-950/90">
                  {/* SINGLE-COLUMN PREVIEW BLOCK, IMAGES BEFORE MANUALS */}
                  <h3 className="text-xl font-semibold text-slate-50">
                    {name ?? "Untitled extraction"}
                  </h3>

                  <div className="mt-2 text-[11px] text-slate-300 flex flex-wrap gap-3">
                    {quality !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 border border-emerald-400/40 px-2.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Quality score:{" "}
                        <span className="font-semibold text-emerald-100">
                          {quality}
                        </span>
                      </span>
                    )}
                    {needsReview !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 border border-amber-400/40 px-2.5 py-1">
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
                    <p className="text-xs font-semibold text-slate-100">
                      Features (preview)
                    </p>
                    {Array.isArray(featuresHtml) ? (
                      <ul className="list-disc list-inside mt-2 max-h-32 overflow-auto text-xs text-slate-200 space-y-1">
                        {featuresHtml.slice(0, 10).map((f: any, i: number) => (
                          <li key={i}>
                            {typeof f === "string" ? f : JSON.stringify(f)}
                          </li>
                        ))}
                        {featuresHtml.length > 10 && (
                          <li className="text-slate-400">…truncated</li>
                        )}
                      </ul>
                    ) : typeof featuresHtml === "string" ? (
                      <p className="text-xs mt-2 text-slate-200 line-clamp-5">
                        {featuresHtml}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">
                        No features extracted yet.
                      </p>
                    )}
                  </div>

                  {/* Images FIRST */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-100 mb-1">
                      Images
                    </p>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {Array.isArray(images) && images.length > 0 ? (
                        images.slice(0, 8).map((img: any, i: number) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img?.url ?? img}
                            alt={`img-${i}`}
                            className="object-cover rounded-lg border border-slate-700 bg-slate-900"
                            style={{ width: "100%", height: 80 }}
                          />
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 col-span-full">
                          No images detected.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manuals / PDFs AFTER images */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-100 mb-1">
                      Manuals &amp; PDFs
                    </p>
                    <div className="mt-1 flex gap-2 flex-wrap">
                      {Array.isArray(pdfUrls) && pdfUrls.length > 0 ? (
                        pdfUrls.slice(0, 8).map((u: string, i: number) => (
                          <a
                            key={i}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 border border-cyan-400/40 px-3 py-1.5 text-[11px] text-cyan-200 hover:text-cyan-100 hover:border-cyan-300"
                          >
                            <span className="text-[13px]">📄</span>
                            <span>PDF {i + 1}</span>
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 ml-1">
                          No manuals or PDFs found.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 text-sm text-slate-400">
                  Submit a product URL using the Extract launcher. AvidiaExtract
                  will display a human-friendly preview here and a full JSON
                  view on the right.
                </div>
              )}
            </div>

            {/* TabsShell: anchored block for raw data */}
            <div className="mt-2" id="extract-results">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-100">
                    Ingest row &amp; raw views
                  </p>
                  <p className="text-[11px] text-slate-400">
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
          <aside className="rounded-3xl bg-slate-900/95 border border-slate-700/70 shadow-2xl shadow-slate-950/80 p-4 lg:p-5 min-h-[520px] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Normalized JSON viewer
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  The exact payload your automations consume. Preferentially
                  shows the normalized preview; falls back to the DB row when
                  needed.
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>
                  {jobId ? (
                    <>
                      Job:{" "}
                      <span className="font-mono text-[10px] text-cyan-200">
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

            <div className="mt-4 flex-1 rounded-2xl border border-slate-700 bg-slate-950/90 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase tracking-[0.18em]">
                  Payload explorer
                </span>
                <span className="text-[10px] text-slate-500">
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
