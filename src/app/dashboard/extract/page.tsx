"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import TabsShell from "@/components/TabsShell";
import JsonViewer from "@/components/JsonViewer";
import { useIngestRow } from "@/hooks/useIngestRow";
import ExtractHeader from "@/components/ExtractHeader";

/**
 * Clean Extract page — simplified:
 * - Uses ExtractHeader component for the single source of truth for submissions.
 * - Shows highlights and normalized JSON on the right.
 * - Scrolling behavior after job creation is preserved.
 */
export default function ExtractPage() {
  const router = useRouter();

  // submission / job state
  const [jobId, setJobId] = useState<string | null>(null);
  const { row, loading: rowLoading, error: rowError } = useIngestRow(jobId, 1500);

  // derive payload for highlights
  const payload = useMemo(() => (row?.normalized_payload ?? row) || null, [row]);
  const name = payload?.name_best ?? payload?.name_raw ?? payload?.name;
  const featuresHtml = payload?.features_html ?? payload?.features_structured ?? payload?.features_raw;
  const pdfUrls = payload?.pdf_manual_urls ?? payload?.pdfs ?? payload?.manuals ?? [];
  const images = payload?.images ?? [];
  const quality = payload?.quality_score;
  const needsReview = payload?.needs_review;

  function onJobCreated(id: string) {
    setJobId(String(id));
    setTimeout(() => {
      const el = document.getElementById("extract-results");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

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
              <p className="text-sm text-slate-500">Human view of the current ingestion job (highlights shown when available).</p>
            </div>
            {jobId && (
              <div className="ml-auto">
                <button
                  onClick={() => router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(jobId)}`)}
                  className="px-3 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
                >
                  Generate SEO Description →
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            {payload ? (
              <div className="border rounded-md p-4 bg-slate-50">
                <div className="flex gap-4">
                  <div style={{ flex: 1 }}>
                    <h4 className="text-xl font-semibold">{name ?? "Untitled extraction"}</h4>
                    <div className="mt-2 text-sm text-slate-700">
                      {quality !== undefined && <span className="mr-3">Quality: <strong>{quality}</strong></span>}
                      {needsReview !== undefined && <span className="mr-3">Needs review: <strong>{String(Boolean(needsReview))}</strong></span>}
                    </div>

                    <div className="mt-3">
                      <strong>Features (preview)</strong>
                      {Array.isArray(featuresHtml) ? (
                        <ul className="list-disc list-inside mt-2 max-h-28 overflow-auto text-sm">
                          {featuresHtml.slice(0, 8).map((f: any, i: number) => <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>)}
                          {featuresHtml.length > 8 && <li>…</li>}
                        </ul>
                      ) : typeof featuresHtml === "string" ? (
                        <p className="text-sm mt-2 line-clamp-4">{featuresHtml}</p>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">No features extracted</div>
                      )}
                    </div>

                    <div className="mt-3">
                      <strong>Manual / PDF</strong>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {Array.isArray(pdfUrls) && pdfUrls.length > 0 ? (
                          pdfUrls.slice(0, 6).map((u: string, i: number) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer" className="text-sky-600 underline text-sm">
                              PDF {i + 1}
                            </a>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500 ml-2">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ width: 200 }}>
                    <div className="text-sm font-medium mb-2">Images</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.isArray(images) && images.length > 0 ? (
                        images.slice(0, 4).map((img: any, i: number) => (
                          <img key={i} src={img?.url ?? img} alt={`img-${i}`} className="object-cover rounded" style={{ width: "100%", height: 80 }} />
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">No images</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded border-dashed border text-slate-400">Submit a URL to extract — highlights will appear here.</div>
            )}
          </div>

          <div className="mt-4" id="extract-results">
            <TabsShell job={row} loading={rowLoading} error={rowError} noDataMessage="Submit a URL to extract raw data" />
          </div>
        </section>

        <aside className="bg-neutral-900 text-neutral-50 rounded-lg shadow-sm p-4 min-h-[520px] overflow-auto">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold">Normalized JSON</h4>
              <p className="text-sm text-neutral-300">Shows the full normalized payload for the selected ingestion job.</p>
            </div>
            <div className="text-sm text-neutral-400">
              <div>{jobId ? `Job: ${jobId}` : "No job yet"}</div>
              <div className="mt-1">{row?.status ? `Status: ${row.status}` : ""}</div>
            </div>
          </div>

          <div className="mt-4">
            <JsonViewer data={row?.normalized_payload ?? row ?? {}} loading={!row && !!jobId} />
          </div>
        </aside>
      </main>
    </div>
  );
}
