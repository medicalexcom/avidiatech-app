// src/app/dashboard/extract/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import TabsShell from "@/components/TabsShell";
import JsonViewer from "@/components/JsonViewer";
import { useIngestRow } from "@/hooks/useIngestRow";
import ExtractHeader from "@/components/ExtractHeader";

/**
 * Extract page:
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
  const { row, loading: rowLoading, error: rowError } = useIngestRow(jobId, 1500);

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
    payload?.features_html ?? payload?.features_structured ?? payload?.features_raw;
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

  return (
    <div className="p-6 space-y-6">
      <header>
        <ExtractHeader onJobCreated={onJobCreated} />
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
        <section className="bg-white rounded-lg shadow-sm p-4 min-h-[520px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Extracted Product</h3>
              <p className="text-sm text-slate-500">
                Human view of the current extraction (preview comes directly
                from the ingest engine; DB status is shown for reference).
              </p>
            </div>
            {jobId && (
              <div className="ml-auto">
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/seo?ingestionId=${encodeURIComponent(jobId)}`
                    )
                  }
                  className="px-3 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
                >
                  Generate SEO Description →
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            {previewLoading ? (
              <div className="p-4 rounded border bg-slate-50">
                Loading preview…
              </div>
            ) : previewError ? (
              <div className="p-4 rounded border-dashed border text-slate-500">
                Preview: {previewError}
              </div>
            ) : payload ? (
              <div className="border rounded-md p-4 bg-slate-50">
                {/* SINGLE-COLUMN PREVIEW BLOCK, IMAGES BEFORE MANUALS */}
                <h4 className="text-xl font-semibold">
                  {name ?? "Untitled extraction"}
                </h4>

                <div className="mt-2 text-sm text-slate-700 flex flex-wrap gap-3">
                  {quality !== undefined && (
                    <span>
                      Quality: <strong>{quality}</strong>
                    </span>
                  )}
                  {needsReview !== undefined && (
                    <span>
                      Needs review:{" "}
                      <strong>{String(Boolean(needsReview))}</strong>
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="mt-3">
                  <strong>Features (preview)</strong>
                  {Array.isArray(featuresHtml) ? (
                    <ul className="list-disc list-inside mt-2 max-h-28 overflow-auto text-sm">
                      {featuresHtml.slice(0, 8).map((f: any, i: number) => (
                        <li key={i}>
                          {typeof f === "string" ? f : JSON.stringify(f)}
                        </li>
                      ))}
                      {featuresHtml.length > 8 && <li>…</li>}
                    </ul>
                  ) : typeof featuresHtml === "string" ? (
                    <p className="text-sm mt-2 line-clamp-4">
                      {featuresHtml}
                    </p>
                  ) : (
                    <div className="text-sm text-slate-500 mt-2">
                      No features extracted
                    </div>
                  )}
                </div>

                {/* Images FIRST (before Manuals / PDF) */}
                <div className="mt-3">
                  <strong>Images</strong>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.isArray(images) && images.length > 0 ? (
                      images.slice(0, 6).map((img: any, i: number) => (
                        <img
                          key={i}
                          src={img?.url ?? img}
                          alt={`img-${i}`}
                          className="object-cover rounded border border-slate-200"
                          style={{ width: "100%", height: 72 }}
                        />
                      ))
                    ) : (
                      <div className="text-sm text-slate-500 col-span-full">
                        No images
                      </div>
                    )}
                  </div>
                </div>

                {/* Manuals / PDFs AFTER images */}
                <div className="mt-3">
                  <strong>Manual / PDF</strong>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {Array.isArray(pdfUrls) && pdfUrls.length > 0 ? (
                      pdfUrls.slice(0, 6).map((u: string, i: number) => (
                        <a
                          key={i}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 underline text-sm"
                        >
                          PDF {i + 1}
                        </a>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 ml-2">
                        None
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded border-dashed border text-slate-400">
                Submit a URL to extract — highlights will appear here.
              </div>
            )}
          </div>

          <div className="mt-4" id="extract-results">
            {/* TabsShell continues to display DB-driven row;
                preview is shown above to accelerate UX */}
            <TabsShell
              job={row}
              loading={rowLoading}
              error={rowError}
              noDataMessage="Submit a URL to extract raw data"
            />
          </div>
        </section>

        <aside className="bg-neutral-900 text-neutral-50 rounded-lg shadow-sm p-4 min-h-[520px] overflow-auto">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold">Normalized JSON</h4>
              <p className="text-sm text-neutral-300">
                Shows the full normalized payload for the current extraction
                (preview preferred, falling back to the DB row).
              </p>
            </div>
            <div className="text-sm text-neutral-400">
              <div>{jobId ? `Job: ${jobId}` : "No job yet"}</div>
              <div className="mt-1">
                {row?.status ? `Status: ${row.status}` : ""}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <JsonViewer
              data={jsonViewerData}
              loading={!row && !!jobId && !preview}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
