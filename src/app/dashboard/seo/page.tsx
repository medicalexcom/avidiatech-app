"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page:
 * - Works with ?ingestionId=... OR ?url=...
 * - If ingestionId is present: loads job and allows generating & saving seo_payload/description_html
 * - If url is present: allows on-the-fly generation of SEO from URL (no ingest required)
 */
export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionId = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState(urlParam || "");

  useEffect(() => {
    if (!ingestionId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
        if (!res.ok) throw new Error(`failed: ${res.status}`);
        const json = await res.json();
        const data = json?.job ? json.job : json;
        setJob(data);
      } catch (err: any) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, [ingestionId]);

  async function generateFromIngestion() {
    if (!ingestionId) {
      setError("missing ingestion id");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingestionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `seo generation failed: ${res.status}`);
        return;
      }
      // refresh job
      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
      const j = await refresh.json();
      setJob(j?.job || j);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  async function generateFromUrl(saveToIngestion = false) {
    if (!urlInput) {
      setError("Please enter a URL");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, persist: !!saveToIngestion }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `seo-from-url failed: ${res.status}`);
        return;
      }

      // If persisted, backend will have created/updated an ingestion; if not, we get seo object back.
      if (json?.ingestionId) {
        // navigate to AvidiaSEO for the created ingestion
        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(json.ingestionId)}`);
        return;
      }

      // otherwise, show returned SEO result inline
      setJob({ seo_payload: json.seo_payload, description_html: json.description_html, source_seo: json.source_seo });
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => router.push(`/dashboard/extract${ingestionId ? `?ingestionId=${encodeURIComponent(ingestionId)}` : ""}`)}>← Back to Extract</button>
        <h2 style={{ margin: 0 }}>AvidiaSEO</h2>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <p>Loading ingestion...</p>}
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        {/* If we have an ingestion, show source_seo */}
        {job && ingestionId && (
          <div style={{ marginTop: 12 }}>
            <h3>Source SEO (scraped)</h3>
            <pre style={{ background: "#f8fafc", padding: 12 }}>{JSON.stringify(job.normalized_payload?.source_seo || job.source_seo || {}, null, 2)}</pre>

            <div style={{ marginTop: 12 }}>
              <button onClick={generateFromIngestion} disabled={generating} style={{ padding: "8px 12px", background: "#0ea5e9", color: "white", borderRadius: 6 }}>
                {generating ? "Generating..." : "Generate SEO Description"}
              </button>
              <span style={{ marginLeft: 12, color: "#666" }}>AvidiaSEO will generate H1, meta title, meta description and a full HTML description.</span>
            </div>

            <hr style={{ margin: "16px 0" }} />

            <h3>Generated SEO (AvidiaSEO)</h3>
            {job.seo_payload ? (
              <div>
                <div><strong>H1:</strong> {job.seo_payload.h1}</div>
                <div><strong>Title:</strong> {job.seo_payload.title}</div>
                <div><strong>Meta:</strong> {job.seo_payload.meta_description}</div>
                <h4 style={{ marginTop: 8 }}>HTML Description</h4>
                <div dangerouslySetInnerHTML={{ __html: job.description_html || "<em>No description generated yet</em>" }} />
              </div>
            ) : (
              <div style={{ color: "#666" }}>No AvidiaSEO generated for this job yet.</div>
            )}
          </div>
        )}

        {/* If no ingestion or direct URL flow: show URL input and on-the-fly generation */}
        <div style={{ marginTop: 16 }}>
          <h3>Generate SEO from a URL (no extract required)</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/product" style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
            <button onClick={() => generateFromUrl(false)} disabled={generating} style={{ padding: "8px 12px", background: "#10b981", color: "white", borderRadius: 6 }}>
              {generating ? "Generating..." : "Generate (Preview)"}
            </button>
            <button onClick={() => generateFromUrl(true)} disabled={generating} style={{ padding: "8px 12px", background: "#3b82f6", color: "white", borderRadius: 6 }}>
              Generate & Save to Ingestion
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <small style={{ color: "#666" }}>
              "Generate (Preview)" will run AvidiaSEO in-memory and display the result here. "Generate & Save to Ingestion" will persist the result to a new product_ingestions row and navigate you to that ingestion.
            </small>
          </div>

          {/* Show inline preview when job contains a generated result (direct URL flow) */}
          {job && !ingestionId && job.seo_payload && (
            <div style={{ marginTop: 16 }}>
              <h4>Preview Generated SEO</h4>
              <div><strong>H1:</strong> {job.seo_payload.h1}</div>
              <div><strong>Title:</strong> {job.seo_payload.title}</div>
              <div><strong>Meta:</strong> {job.seo_payload.meta_description}</div>
              <h4 style={{ marginTop: 8 }}>HTML Description</h4>
              <div dangerouslySetInnerHTML={{ __html: job.description_html || "<em>No description generated</em>" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
