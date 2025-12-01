"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * - Works with ?ingestionId=... OR ?url=...
 * - If ingestionId is present: loads job and allows generating & saving seo_payload/description_html
 * - If url is present: allows on-the-fly generation of SEO from URL (no ingest required)
 *
 * Notes:
 * - This component tolerates different API shapes (snake_case vs camelCase).
 * - Keeps layout responsive and avoids horizontal scrolling for large JSON / HTML blocks.
 *
 * Fixes applied:
 * - Buttons now explicitly use type="button" to avoid accidental form submit behavior.
 * - Generation functions are guarded against concurrent runs (check `generating` at start).
 * - Added defensive logging and clearer error handling so overlapping runs are less likely and easier to debug.
 */

type AnyObj = Record<string, any>;

function normalizeSeoResponse(resp: AnyObj) {
  if (!resp) return null;

  // unwrap common wrappers
  const payload = resp?.data ?? resp?.job ?? resp;

  const seoPayload = payload?.seo_payload ?? payload?.seoPayload ?? null;
  const descriptionHtml = payload?.description_html ?? payload?.descriptionHtml ?? null;

  const sourceSeo =
    payload?.normalized_payload?.source_seo ??
    payload?.source_seo ??
    payload?.sourceSeo ??
    payload?.normalized_payload ??
    null;

  const ingestionId = payload?.id ?? payload?.ingestionId ?? payload?.ingestion_id ?? null;
  const seoId = payload?.seoId ?? payload?.seo_id ?? null;

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    source_seo: sourceSeo,
    ingestionId,
    seoId,
    raw: payload,
  };
}

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;

  // treat ingestionId as a stable param (no setter needed)
  const ingestionId = ingestionIdParam;

  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ingestionId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        }
        const normalized = normalizeSeoResponse(json);
        if (!cancelled) setJob(normalized?.raw ?? normalized);
      } catch (err: any) {
        if (!cancelled) setError(String(err?.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ingestionId]);

  async function generateFromIngestion() {
    if (generating) return; // guard concurrent runs
    if (!ingestionId) {
      setError("Missing ingestion id");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      console.debug("generateFromIngestion: starting for", ingestionId);
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingestionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || json?.error || `SEO generation failed: ${res.status}`);
        console.warn("generateFromIngestion: error response", { status: res.status, body: json });
        return;
      }

      // re-fetch ingestion to pick up persisted SEO if backend updated it
      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
      const refJson = await refresh.json();
      if (!refresh.ok) {
        // fallback to returned response if re-fetch failed
        const normalized = normalizeSeoResponse(json);
        setJob(normalized?.raw ?? normalized);
      } else {
        setJob(normalizeSeoResponse(refJson)?.raw ?? normalizeSeoResponse(refJson));
      }
    } catch (err: any) {
      console.error("generateFromIngestion error", err);
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  async function generateFromUrl(saveToIngestion = false) {
    if (generating) return; // guard concurrent runs
    if (!urlInput) {
      setError("Please enter a URL");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      console.debug("generateFromUrl: starting", { url: urlInput, persist: saveToIngestion });
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, persist: !!saveToIngestion }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || json?.error || `SEO-from-url failed: ${res.status}`);
        console.warn("generateFromUrl: error response", { status: res.status, body: json });
        return;
      }

      const returnedIngestionId = json?.ingestionId ?? json?.ingestion_id ?? null;
      if (returnedIngestionId) {
        // navigating away; avoid further state updates
        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(returnedIngestionId)}`);
        return;
      }

      const normalized = normalizeSeoResponse(json);
      if (normalized) {
        setJob(normalized?.raw ?? normalized);
      } else {
        setJob({ seo_payload: json?.seoPayload ?? json?.seo_payload, description_html: json?.descriptionHtml ?? json?.description_html });
      }
    } catch (err: any) {
      console.error("generateFromUrl error", err);
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  const renderPreview = () => {
    const seoPayload = job?.seo_payload ?? job?.seoPayload ?? null;
    const descriptionHtml = job?.description_html ?? job?.descriptionHtml ?? null;
    return (
      <>
        <h3>Generated SEO (AvidiaSEO)</h3>
        {seoPayload ? (
          <div>
            <div><strong>H1:</strong> {seoPayload.h1 ?? seoPayload.name_best ?? ""}</div>
            <div><strong>Title:</strong> {seoPayload.title ?? ""}</div>
            <div><strong>Meta:</strong> {seoPayload.metaDescription ?? seoPayload.meta_description ?? ""}</div>
            <h4 style={{ marginTop: 8 }}>HTML Description</h4>
            <div
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", border: "1px solid #eee", padding: 12, background: "#fff" }}
              dangerouslySetInnerHTML={{ __html: descriptionHtml || "<em>No description generated yet</em>" }}
            />
          </div>
        ) : (
          <div style={{ color: "#666" }}>No AvidiaSEO generated for this job yet.</div>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/extract${ingestionId ? `?ingestionId=${encodeURIComponent(ingestionId)}` : ""}`)}
            className="px-2 py-1 border rounded"
          >
            ← Back to Extract
          </button>
          <h2 className="m-0">AvidiaSEO</h2>
        </div>

        {loading && <p>Loading ingestion...</p>}
        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

        {/* If we have an ingestion, show source_seo */}
        {job && ingestionId && (
          <div style={{ marginTop: 12 }}>
            <h3>Source SEO (scraped)</h3>
            <pre style={{ background: "#f8fafc", padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {JSON.stringify(
                job.normalized_payload?.source_seo ?? job.source_seo ?? job.normalized_payload ?? job.sourceSeo ?? {},
                null,
                2
              )}
            </pre>

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button
                type="button"
                onClick={generateFromIngestion}
                disabled={generating}
                className="px-3 py-2 bg-sky-600 text-white rounded"
              >
                {generating ? "Generating..." : "Generate SEO Description"}
              </button>
              <span style={{ color: "#666" }}>AvidiaSEO will generate H1, title, meta description and a full HTML description.</span>
            </div>

            <hr style={{ margin: "16px 0" }} />

            {renderPreview()}
          </div>
        )}

        {/* If no ingestion or direct URL flow: show URL input and on-the-fly generation */}
        <div style={{ marginTop: 16 }}>
          <h3>Generate SEO from a URL (no extract required)</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://manufacturer.com/product/..."
              style={{ flex: 1, minWidth: 240, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
              type="url"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); generateFromUrl(false); }}
              disabled={generating}
              className="px-3 py-2 bg-emerald-500 text-white rounded"
            >
              {generating ? "Generating..." : "Generate (Preview)"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); generateFromUrl(true); }}
              disabled={generating}
              className="px-3 py-2 bg-sky-600 text-white rounded"
            >
              {generating ? "Generating..." : "Generate & Save to Ingestion"}
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <small style={{ color: "#666" }}>
              "Generate (Preview)" will run AvidiaSEO in-memory and display the result here. "Generate & Save to Ingestion" will persist the result to a new product_ingestions row and navigate you to that ingestion.
            </small>
          </div>

          {/* Show inline preview when job contains a generated result (direct URL flow) */}
          {job && !ingestionId && (job.seo_payload || job.seoPayload) && (
            <div style={{ marginTop: 16 }}>
              <h4>Preview Generated SEO</h4>
              <div><strong>H1:</strong> {(job.seo_payload ?? job.seoPayload)?.h1 ?? ""}</div>
              <div><strong>Title:</strong> {(job.seo_payload ?? job.seoPayload)?.title ?? ""}</div>
              <div><strong>Meta:</strong> {(job.seo_payload ?? job.seoPayload)?.meta_description ?? (job.seo_payload ?? job.seoPayload)?.metaDescription ?? ""}</div>
              <h4 style={{ marginTop: 8 }}>HTML Description</h4>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", border: "1px solid #eee", padding: 12, background: "#fff" }} dangerouslySetInnerHTML={{ __html: job.description_html || job.descriptionHtml || "<em>No description generated</em>" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
