"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page:
 * - reads ingestionId from ?ingestionId=
 * - fetches job via GET /api/v1/ingest/:id
 * - shows source_seo and allows user to run AvidiaSEO (POST /api/v1/seo)
 * - displays generated seo_payload and description_html after generation
 */
export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionId = params?.get("ingestionId") || null;

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const generateSeo = async () => {
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
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => router.push(`/dashboard/extract?ingestionId=${encodeURIComponent(ingestionId || "")}`)}>← Back to Extract</button>
        <h2 style={{ margin: 0 }}>AvidiaSEO</h2>
      </div>

      {loading && <p>Loading ingestion...</p>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {job && (
        <div style={{ marginTop: 16 }}>
          <h3>Source SEO (scraped)</h3>
          <pre style={{ background: "#f8fafc", padding: 12 }}>{JSON.stringify(job.normalized_payload?.source_seo || {}, null, 2)}</pre>

          <div style={{ marginTop: 12 }}>
            <button onClick={generateSeo} disabled={generating} style={{ padding: "8px 12px", background: "#0ea5e9", color: "white", borderRadius: 6 }}>
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
    </div>
  );
}
