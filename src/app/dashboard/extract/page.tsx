"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TabsShell from "@/components/TabsShell";
import JsonViewer from "@/components/JsonViewer";
import IngestResult from "@/components/IngestResult";
import { useIngestRow } from "@/hooks/useIngestRow";

/**
 * Extract page (NEW Extract Window)
 *
 * - Extract = raw + structured data only. NO AvidiaSEO generation here.
 * - Shows two-pane layout: left = human readable tabs, right = full JSON viewer.
 * - Top header collects URL and module toggles (SEO toggle removed).
 * - Bottom area repeats the important controls + job summary for quick re-run.
 * - After extraction completes user can click "Generate SEO Description →"
 *   which navigates to AvidiaSEO: /dashboard/seo?ingestionId=<id>
 *
 * Assumes the following components/hooks exist in the repo:
 * - src/components/TabsShell.tsx
 * - src/components/JsonViewer.tsx
 * - src/components/IngestResult.tsx
 * - src/hooks/useIngestRow.ts
 *
 * The page posts to POST /api/v1/ingest (gateway) and polls GET /api/v1/ingest/:id
 * to populate the UI when the engine callback completes.
 */

export default function ExtractPage() {
  const router = useRouter();

  // Form state (top & bottom controls are kept in sync)
  const [url, setUrl] = useState("");
  const [fullExtract, setFullExtract] = useState(true);
  const [includeSpecs, setIncludeSpecs] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(false);
  const [includeVariants, setIncludeVariants] = useState(false);
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">("JSON");

  // submission / job state
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { row, loading: rowLoading, error: rowError } = useIngestRow(jobId, 1500);

  // helper: build options sent to gateway (note: do NOT request AvidiaSEO here)
  const buildOptions = () =>
    fullExtract
      ? { includeSeo: false, includeSpecs: true, includeDocs: true, includeVariants: true }
      : { includeSeo: false, includeSpecs, includeDocs, includeVariants };

  async function submitIngest() {
    if (!url) return;
    setSubmitting(true);
    setJobId(null);
    try {
      const payload: any = {
        url,
        export_type: exportType,
        correlationId: `corr_${Date.now()}`,
        fullExtract,
      };
      if (!fullExtract) payload.options = { includeSpecs, includeDocs, includeVariants };

      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("ingest request failed", json);
        alert(`Ingest request failed: ${json?.error || res.status}`);
        return;
      }

      const id = json?.jobId || json?.job_id || json?.id;
      if (!id) {
        alert("Ingest did not return a job id");
        return;
      }

      setJobId(String(id));
      // scroll to results area if desired
      setTimeout(() => {
        const el = document.getElementById("extract-results");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (err: any) {
      console.error(err);
      alert(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  function onToggleModule(setter: (v: boolean) => void, current: boolean) {
    // turning a module ON disables fullExtract
    if (!current) setFullExtract(false);
    setter(!current);
  }

  function onToggleFullExtract() {
    const next = !fullExtract;
    setFullExtract(next);
    if (next) {
      // clear explicit selections (they become implicit)
      setIncludeSpecs(false);
      setIncludeDocs(false);
      setIncludeVariants(false);
    }
  }

  const seoCta = jobId && (
    <div className="mt-4 p-4 rounded-lg shadow-sm bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
      <div>
        <strong className="block">⚡ Ready to Generate SEO?</strong>
        <p className="text-sm text-slate-600">Use AvidiaSEO to create an optimized H1, title & HTML description from this extraction.</p>
      </div>
      <div>
        <button
          onClick={() => router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(jobId)}`)}
          className="ml-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
        >
          Generate SEO Description →
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Top header */}
      <header className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex gap-3 items-start">
          <input
            aria-label="Product URL to ingest"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://manufacturer.com/product/xyz"
            className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-300"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitIngest();
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submitIngest}
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 text-white rounded-md shadow hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? "Extracting…" : "Extract Product"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fullExtract} onChange={onToggleFullExtract} />
            <span className="text-sm">Full extract (recommended)</span>
          </label>

          <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input type="checkbox" checked={includeSpecs} onChange={() => onToggleModule(setIncludeSpecs, includeSpecs)} disabled={fullExtract} />
            <span className="text-sm">Include Specs</span>
          </label>

          <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input type="checkbox" checked={includeDocs} onChange={() => onToggleModule(setIncludeDocs, includeDocs)} disabled={fullExtract} />
            <span className="text-sm">Include Manuals / PDF extraction</span>
          </label>

          <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input type="checkbox" checked={includeVariants} onChange={() => onToggleModule(setIncludeVariants, includeVariants)} disabled={fullExtract} />
            <span className="text-sm">Generate Variants</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm mr-2">Export</label>
            <select value={exportType} onChange={(e) => setExportType(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="JSON">JSON</option>
              <option value="Shopify">Shopify</option>
              <option value="BigCommerce">BigCommerce</option>
            </select>
          </div>
        </div>
      </header>

      {/* Split view */}
      <main className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
        {/* Left pane: TabsShell (human readable) */}
        <section className="bg-white rounded-lg shadow-sm p-4 min-h-[520px]">
          <h3 className="text-lg font-semibold mb-3">Extracted Product</h3>
          <div id="extract-results" className="h-full overflow-auto">
            <TabsShell job={row} loading={rowLoading} error={rowError} noDataMessage="Submit a URL to extract raw data" />
          </div>

          {/* CTA only after job exists */}
          {seoCta}
        </section>

        {/* Right pane: JSON viewer */}
        <aside className="bg-neutral-900 text-neutral-50 rounded-lg shadow-sm p-4 min-h-[520px] overflow-auto">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold">Normalized JSON</h4>
              <p className="text-sm text-neutral-300">Full normalized product payload (raw + modules). Shows seo:null until AvidiaSEO runs.</p>
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

      {/* Bottom mirrored controls + quick summary */}
      <footer className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex gap-3">
              <input
                aria-label="Product URL to ingest (bottom)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://manufacturer.com/product/xyz"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <button onClick={submitIngest} disabled={submitting} className="px-4 py-2 bg-sky-600 text-white rounded-md">
                {submitting ? "Extracting…" : "Extract Product"}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={fullExtract} onChange={onToggleFullExtract} />
                <span className="text-sm">Full extract</span>
              </label>

              <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={includeSpecs} onChange={() => onToggleModule(setIncludeSpecs, includeSpecs)} disabled={fullExtract} />
                <span className="text-sm">Specs</span>
              </label>

              <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={includeDocs} onChange={() => onToggleModule(setIncludeDocs, includeDocs)} disabled={fullExtract} />
                <span className="text-sm">Manuals</span>
              </label>

              <label className={`flex items-center gap-2 ${fullExtract ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={includeVariants} onChange={() => onToggleModule(setIncludeVariants, includeVariants)} disabled={fullExtract} />
                <span className="text-sm">Variants</span>
              </label>
            </div>
          </div>

          {/* Job summary */}
          <div className="w-64 border-l pl-4">
            <div className="text-sm text-slate-600">Job summary</div>
            <div className="mt-2 text-sm">
              <div><strong>ID:</strong> {jobId ?? "—"}</div>
              <div><strong>Status:</strong> {row?.status ?? "—"}</div>
              <div><strong>Created:</strong> {row?.created_at ?? "—"}</div>
              <div><strong>Completed:</strong> {row?.completed_at ?? "—"}</div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {jobId && <IngestResult jobId={jobId} onClose={() => { setJobId(null); }} />}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Note: Extract only scrapes and normalizes data. To generate AI‑powered SEO (H1, title, meta, HTML description) click “Generate SEO Description →”.
        </div>
      </footer>
    </div>
  );
}
