"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * - Works with ?ingestionId=... OR ?url=...
 * - If ingest returns jobId (202), poll /api/v1/ingest/job/:jobId until ingestion row appears.
 * - Then call /api/v1/seo with ingestionId. If persist denied (401), fall back to preview (persist:false).
 */

type AnyObj = Record<string, any>;

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;

  const ingestionId = ingestionIdParam;
  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug / polling state
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  // track whether current seo result is preview (not persisted)
  const [isPreviewResult, setIsPreviewResult] = useState(false);

  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        if (!cancelled) setJob(json);
      } catch (err: any) {
        if (!cancelled) setError(String(err?.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ingestionId]);

  async function generateFromIngestion(id: string, tryPersist = true) {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setIsPreviewResult(false);

    // Helper to call SEO endpoint and return parsed JSON + raw
    async function callSeo(persistFlag: boolean) {
      try {
        const res = await fetch("/api/v1/seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingestionId: id, persist: persistFlag }),
        });
        const json = await res.json().catch(() => null);
        return { status: res.status, ok: res.ok, json, rawStatus: res.status };
      } catch (err) {
        return { status: 0, ok: false, json: null, error: String(err) };
      }
    }

    try {
      // Attempt persisted generation first if requested
      if (tryPersist) {
        const first = await callSeo(true);
        console.debug("POST /api/v1/seo (persist:true) =>", first);
        // If success (200), refresh page/insertion
        if (first.ok) {
          // persisted result returned; reload ingestion view
          router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(id)}`);
          return;
        }

        // If unauthorized-to-persist or 401, gracefully fall back to preview
        const code = first.json?.error?.code ?? "";
        if (first.status === 401 || code === "UNAUTHORIZED_TO_PERSIST" || first.status === 403) {
          // fallback to preview generation (persist:false)
          const preview = await callSeo(false);
          console.debug("POST /api/v1/seo (persist:false) =>", preview);
          if (preview.ok) {
            setIsPreviewResult(true);
            // update job preview state so UI shows generated SEO
            const previewBody = preview.json;
            // normalize fields into job-like shape expected by UI
            const previewJob = {
              seo_payload: previewBody?.seoPayload ?? previewBody?.seo_payload ?? previewBody,
              description_html: previewBody?.descriptionHtml ?? previewBody?.description_html ?? previewBody?.descriptionHtml ?? previewBody?.description_html,
              _debug: previewBody?._debug ?? null
            };
            setJob(previewJob);
            // surface a helpful next step
            setError("Preview generated. Sign in to persist SEO for this ingestion.");
            return;
          } else {
            // preview failed too
            setError(preview.json?.error?.message ?? `Preview failed: ${preview.status}`);
            return;
          }
        }

        // if other non-ok status, surface the error and show raw debug
        setError(first.json?.error?.message ?? `SEO generation failed: ${first.status}`);
        return;
      }

      // If tryPersist was false, call persist:false directly
      const result = await callSeo(false);
      console.debug("POST /api/v1/seo (persist:false) =>", result);
      if (result.ok) {
        setIsPreviewResult(true);
        const previewBody = result.json;
        const previewJob = {
          seo_payload: previewBody?.seoPayload ?? previewBody?.seo_payload ?? previewBody,
          description_html: previewBody?.descriptionHtml ?? previewBody?.description_html ?? previewBody
        };
        setJob(previewJob);
      } else {
        setError(result.json?.error?.message ?? `SEO preview failed: ${result.status}`);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setGenerating(false);
    }
  }

  // Polling helper: polls /api/v1/ingest/job/:jobId until ingestion row appears or timeout
  async function pollForIngestion(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
        if (res.status === 200) {
          const j = await res.json();
          setPollingState(`completed: ingestionId=${j.ingestionId}`);
          return j; // { ingestionId, normalized_payload, status }
        }
        // still pending
        setPollingState(`waiting... ${(Math.floor((Date.now()-start)/1000))}s`);
      } catch (e) {
        console.warn("pollForIngestion error", e);
        setPollingState(`error polling: ${String(e)}`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    setPollingState("timeout");
    throw new Error("Ingestion did not complete within timeout");
  }

  // Safer ingestion + generate flow (handles sync id, or jobId via polling)
  async function createIngestionThenGenerate(url: string) {
    if (generating) return;
    if (!url) { setError("Please enter a URL"); return; }
    setGenerating(true);
    setError(null);
    setRawIngestResponse(null);
    setPollingState(null);
    try {
      // 1) create ingestion (persist:true)
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, persist: true })
      });
      const json = await res.json().catch(() => null);
      console.debug("POST /api/v1/ingest response:", res.status, json);
      setRawIngestResponse({ status: res.status, body: json });

      if (!res.ok) {
        setError(json?.error?.message || json?.error || `Ingest failed: ${res.status}`);
        return;
      }

      // If ingest returned a synchronous ingestionId, use it
      const possibleIngestionId =
        json?.ingestionId ??
        json?.id ??
        json?.data?.id ??
        json?.data?.ingestionId ??
        null;

      if (possibleIngestionId) {
        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(possibleIngestionId)}`);
        // call SEO and let the function handle persist fallback
        await generateFromIngestion(possibleIngestionId, true);
        return;
      }

      // Otherwise, if ingest returned a jobId (async), poll for ingestion
      const jobId = json?.jobId ?? json?.job?.id ?? null;
      if (!jobId) {
        setError("Ingest did not return an ingestionId or jobId. See debug pane.");
        return;
      }

      // Poll for ingestion row
      let pollResult;
      try {
        pollResult = await pollForIngestion(jobId, 120_000, 3000);
      } catch (e: any) {
        setError(String(e?.message || e));
        return;
      }

      const newIngestionId = pollResult?.ingestionId ?? pollResult?.id ?? null;
      if (!newIngestionId) {
        setError("Polling returned no ingestionId. See debug pane.");
        return;
      }

      // update route and call SEO (persist:true by default — will fallback to preview if unauthorized)
      router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(newIngestionId)}`);
      await generateFromIngestion(newIngestionId, true);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
      setPollingState(null);
    }
  }

  async function handleGenerateAndSave() {
    setError(null);
    if (ingestionId) {
      await generateFromIngestion(ingestionId, true);
    } else {
      await createIngestionThenGenerate(urlInput);
    }
  }

  const renderPreview = () => {
    const seoPayload = job?.seo_payload ?? job?.seoPayload ?? null;
    const descriptionHtml = job?.description_html ?? job?.descriptionHtml ?? null;
    return (
      <>
        <h3>Generated SEO (AvidiaSEO){isPreviewResult ? " — Preview (not saved)" : ""}</h3>
        {seoPayload ? (
          <div>
            <div><strong>H1:</strong> {seoPayload.h1 ?? seoPayload.name_best ?? ""}</div>
            <div><strong>Title:</strong> {seoPayload.title ?? ""}</div>
            <div><strong>Meta:</strong> {seoPayload.metaDescription ?? seoPayload.meta_description ?? ""}</div>
            <h4 style={{ marginTop: 8 }}>HTML Description</h4>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", border: "1px solid #eee", padding: 12, background: "#fff" }} dangerouslySetInnerHTML={{ __html: descriptionHtml || "<em>No description generated yet</em>" }} />
            {isPreviewResult && (
              <div style={{ marginTop: 8, color: "#444" }}>
                <em>This is a preview. Sign in to persist this SEO to the ingestion.</em>
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => window.location.href = `/sign-in?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="px-3 py-2 bg-sky-600 text-white rounded">Sign in to Save</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "#666" }}>No AvidiaSEO generated for this ingestion yet.</div>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button type="button" onClick={() => router.push(`/dashboard/extract${ingestionId ? `?ingestionId=${encodeURIComponent(ingestionId)}` : ""}`)} className="px-2 py-1 border rounded">← Back to Extract</button>
          <h2 className="m-0">AvidiaSEO</h2>
        </div>

        {loading && <p>Loading ingestion...</p>}
        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

        {rawIngestResponse && (
          <div style={{ marginTop: 12, background: "#fff8", padding: 12, borderRadius: 6 }}>
            <h4>Raw /api/v1/ingest response (debug)</h4>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(rawIngestResponse, null, 2)}</pre>
            {pollingState && <div style={{ marginTop: 8 }}><strong>Polling:</strong> {pollingState}</div>}
          </div>
        )}

        {job && ingestionId && (
          <div style={{ marginTop: 12 }}>
            <h3>Source SEO (scraped)</h3>
            <pre style={{ background: "#f8fafc", padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>{JSON.stringify(job.normalized_payload ?? job, null, 2)}</pre>

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={handleGenerateAndSave} disabled={generating} className="px-3 py-2 bg-sky-600 text-white rounded">{generating ? "Generating..." : "Generate & Save"}</button>
              <span style={{ color: "#666" }}>Generate and persist AvidiaSEO for this ingestion (requires authentication).</span>
            </div>

            <hr style={{ margin: "16px 0" }} />

            {renderPreview()}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <h3>Generate SEO from a URL (no extract required)</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://manufacturer.com/product/..." style={{ flex: 1, minWidth: 240, padding: 8, borderRadius: 6, border: "1px solid #ddd" }} type="url" />
            <button type="button" onClick={(e) => { e.preventDefault(); handleGenerateAndSave(); }} disabled={generating} className="px-3 py-2 bg-sky-600 text-white rounded">{generating ? "Generating..." : "Generate & Save"}</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <small style={{ color: "#666" }}>Clicking "Generate & Save" will first create an ingestion (AvidiaExtract) and then run AvidiaSEO on that ingestion. The page will redirect to the ingestion view once created.</small>
          </div>

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
