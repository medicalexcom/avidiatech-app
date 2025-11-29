"use client";
import React, { useState } from "react";

/**
 * Header: URL input, toggles, Extract button.
 * Calls POST /api/v1/ingest and returns jobId via onJobCreated.
 */
export default function ExtractHeader({ onJobCreated }: { onJobCreated: (jobId: string) => void }) {
  const [url, setUrl] = useState("");
  const [fullExtract, setFullExtract] = useState(true);
  const [includeSeo, setIncludeSeo] = useState(false);
  const [includeSpecs, setIncludeSpecs] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(false);
  const [includeVariants, setIncludeVariants] = useState(false);
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">("JSON");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onToggleModule(setter: (v: boolean) => void, value: boolean) {
    if (!value) setFullExtract(false); // turning ON disables fullExtract
    setter(!value);
  }

  function onToggleFull() {
    const next = !fullExtract;
    setFullExtract(next);
    if (next) {
      setIncludeSeo(false);
      setIncludeSpecs(false);
      setIncludeDocs(false);
      setIncludeVariants(false);
    }
  }

  async function submit() {
    if (!url) {
      setErr("Please enter a URL");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const body: any = {
        url,
        export_type: exportType,
        correlationId: `corr_${Date.now()}`,
        fullExtract,
      };
      if (!fullExtract) {
        body.options = {
          includeSeo,
          includeSpecs,
          includeDocs,
          includeVariants,
        };
      }

      // include credentials so Clerk/session cookies are sent with the request
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        credentials: "same-origin", // <<-- ensure cookies are sent
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || `ingest failed: ${res.status}`);
        return;
      }
      const id = json?.jobId || json?.job_id || json?.id;
      if (id) onJobCreated(String(id));
    } catch (err: any) {
      setErr(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://manufacturer.com/product/xyz"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />
        <button onClick={submit} disabled={loading} style={{ padding: "8px 14px", background: "#2563eb", color: "white", borderRadius: 6 }}>
          {loading ? "Extracting…" : "Extract Product"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={fullExtract} onChange={onToggleFull} />
          <strong>Full extract (recommended)</strong>
        </label>

        <label style={{ opacity: fullExtract ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeSeo} onChange={() => onToggleModule(setIncludeSeo, includeSeo)} disabled={fullExtract} />
          Include SEO?
        </label>

        <label style={{ opacity: fullExtract ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeSpecs} onChange={() => onToggleModule(setIncludeSpecs, includeSpecs)} disabled={fullExtract} />
          Include Specs?
        </label>

        <label style={{ opacity: fullExtract ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeDocs} onChange={() => onToggleModule(setIncludeDocs, includeDocs)} disabled={fullExtract} />
          Include Manuals / PDF extraction?
        </label>

        <label style={{ opacity: fullExtract ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={includeVariants} onChange={() => onToggleModule(setIncludeVariants, includeVariants)} disabled={fullExtract} />
          Generate Variants?
        </label>

        <select value={exportType} onChange={(e) => setExportType(e.target.value as any)} style={{ marginLeft: "auto", padding: 6 }}>
          <option value="JSON">JSON</option>
          <option value="Shopify">Shopify</option>
          <option value="BigCommerce">BigCommerce</option>
        </select>
      </div>

      {err && <div style={{ color: "crimson" }}>{err}</div>}
    </div>
  );
}
