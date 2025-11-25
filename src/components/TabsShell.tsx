"use client";
import React from "react";

/**
 * Minimal tab shell for Extract page.
 * - Shows Source SEO (scraped) separately.
 * - Does NOT display AvidiaSEO (generated) content here.
 * - No "Generate SEO" button in Overview (CTA lives on Extract page).
 */
export default function TabsShell({ job, loading, error, noDataMessage }: any) {
  const payload = job?.normalized_payload || job?.raw_payload || null;

  // quick detection which tabs to show; show when module present or raw available
  const hasSourceSeo = !!payload?.source_seo;
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
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button>Overview</button>
        {/* Note: Extract should NOT render AvidiaSEO. The SEO tab here shows only Source SEO (scraped). */}
        <button disabled={!hasSourceSeo}>Source SEO</button>
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
          <div
            style={{
              // allow long HTML content to wrap and not cause horizontal scroll
              overflowWrap: "anywhere",
            }}
            dangerouslySetInnerHTML={{
              __html: payload?.description_html || payload?.raw_preview || "<em>No overview available</em>",
            }}
          />
        </section>

        {/* Source SEO */}
        <section style={{ marginBottom: 12 }}>
          <h4>Source SEO (scraped)</h4>
          {hasSourceSeo ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6, width: 160 }}>Source H1</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.source_h1 ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Title Tag</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.source_title_tag ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Meta Description</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.source_meta_description ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>Canonical</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.canonical ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>OG Title</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.og_title ?? "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, padding: 6 }}>OG Description</td>
                  <td style={{ padding: 6 }}>{payload.source_seo?.og_description ?? "-"}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#666" }}>No scraped SEO fields were found on the source site.</div>
          )}
          <p style={{ marginTop: 8, color: "#444" }}>
            These SEO fields were extracted from the source website. They are NOT generated or optimized by AvidiaTech.
          </p>
        </section>

        {/* Specs */}
        <section style={{ marginBottom: 12 }}>
          <h4>Specs</h4>
          {hasSpecs ? (
            <pre style={{ background: "#f3f4f6", padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(payload.specs_json || payload.specs || payload.specs_payload, null, 2)}
            </pre>
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
                <li key={i}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    Download {p.filename || p.url}
                  </a>
                </li>
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
            <pre style={{ background: "#f3f4f6", padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(payload.variants, null, 2)}
            </pre>
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
          <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 8, wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {payload?.raw_preview || payload?.raw_html || "No raw content"}
          </pre>
        </section>

        <section style={{ marginTop: 12 }}>
          <h4>Diagnostics</h4>
          <pre style={{ background: "#fff7ed", padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(job?.diagnostics || payload?.diagnostics || {}, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
