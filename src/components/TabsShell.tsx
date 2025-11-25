"use client";
import React from "react";

/**
 * Minimal tab shell. Each tab reads from job.normalized_payload (if available).
 * Extend each pane into separate components as needed.
 */
export default function TabsShell({ job, loading, error, noDataMessage }: any) {
  const payload = job?.normalized_payload || job?.raw_payload || null;

  // quick detection which tabs to show; show when module present or raw available
  const hasSeo = !!payload?.seo;
  const hasSpecs = !!payload?.specs_json || !!payload?.specs || !!payload?.specs_payload;
  const hasManuals = Array.isArray(payload?.pdfs) && payload.pdfs.length > 0;
  const hasVariants = Array.isArray(payload?.variants) && payload.variants.length > 0;
  const hasImages = Array.isArray(payload?.images) && payload.images.length > 0;

  if (!job && !loading) {
    return <div>{noDataMessage}</div>;
  }

  if (loading && !job) {
    return <div>Waiting for engine to complete…</div>;
  }

  if (error) {
    return <div style={{ color: "crimson" }}>{String(error)}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button>Overview</button>
        <button disabled={!hasSeo}>SEO</button>
        <button disabled={!hasSpecs}>Specs</button>
        <button disabled={!hasManuals}>Manuals</button>
        <button disabled={!hasVariants}>Variants</button>
        <button disabled={!hasImages}>Images</button>
        <button>Raw</button>
        <button>Diagnostics</button>
      </div>

      <div>
        {/* Overview */}
        <section style={{ marginBottom: 12 }}>
          <h4>Overview</h4>
          <div dangerouslySetInnerHTML={{ __html: payload?.description_html || payload?.raw_preview || "<em>No overview available</em>" }} />
        </section>

        {/* SEO */}
        <section style={{ marginBottom: 12 }}>
          <h4>SEO</h4>
          {hasSeo ? (
            <div>
              <div><strong>H1:</strong> {payload.seo?.h1}</div>
              <div><strong>Title:</strong> {payload.seo?.title}</div>
              <div><strong>Meta:</strong> <div>{payload.seo?.meta_description}</div></div>
            </div>
          ) : (
            <div style={{ color: "#666" }}>SEO not generated</div>
          )}
        </section>

        {/* Specs */}
        <section style={{ marginBottom: 12 }}>
          <h4>Specs</h4>
          {hasSpecs ? (
            <pre style={{ background: "#f3f4f6", padding: 8 }}>{JSON.stringify(payload.specs_json || payload.specs || payload.specs_payload, null, 2)}</pre>
          ) : (
            <div style={{ color: "#666" }}>Specs not generated</div>
          )}
        </section>

        {/* Manuals */}
        <section style={{ marginBottom: 12 }}>
          <h4>Manuals / PDFs</h4>
          {hasManuals ? (
            <ul>
              {payload.pdfs.map((p: any, i: number) => (
                <li key={i}><a href={p.url} target="_blank" rel="noreferrer">Download {p.filename || p.url}</a></li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#666" }}>No manuals extracted</div>
          )}
        </section>

        {/* Variants */}
        <section style={{ marginBottom: 12 }}>
          <h4>Variants</h4>
          {hasVariants ? (
            <pre style={{ background: "#f3f4f6", padding: 8 }}>{JSON.stringify(payload.variants, null, 2)}</pre>
          ) : (
            <div style={{ color: "#666" }}>No variants</div>
          )}
        </section>

        {/* Images */}
        <section style={{ marginBottom: 12 }}>
          <h4>Images</h4>
          {hasImages ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {payload.images.map((img: any, i: number) => (
                <img key={i} src={img.url} alt={img.alt || ""} width={120} style={{ objectFit: "cover", borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <div style={{ color: "#666" }}>No images</div>
          )}
        </section>

        {/* Raw extraction & diagnostics */}
        <section>
          <h4>Raw Extraction</h4>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 8 }}>{payload?.raw_preview || payload?.raw_html || "No raw content"}</pre>
        </section>

        <section style={{ marginTop: 12 }}>
          <h4>Diagnostics</h4>
          <pre style={{ background: "#fff7ed", padding: 8 }}>{JSON.stringify(job?.diagnostics || payload?.diagnostics || {}, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
