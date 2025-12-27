"use client";
import React, { useState } from "react";

/**
 * Header: URL input + Extract button.
 *
 * Updated (2025-12):
 * - Remove old module toggles (SEO/specs/docs/variants). These caused invalid ingest jobs
 *   (includeSeo=true with includeSpecs=false), which breaks strict compliance downstream.
 * - Server now always runs a full extract with specs enabled.
 */
export default function ExtractHeader({
  onJobCreated,
}: {
  onJobCreated: (jobId: string, url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">(
    "JSON"
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        fullExtract: true, // always full extract now
      };

      // include Clerk cookies/session so the server sees an authenticated user
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          json?.error || json?.message || `Ingest failed (${res.status})`;
        setErr(message);
        return;
      }

      const id = json?.jobId || json?.job_id || json?.id;
      if (id) {
        onJobCreated(String(id), url);
      } else {
        setErr("Ingest succeeded but no job id returned");
      }
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
          aria-label="Product URL to ingest"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://manufacturer.com/product/xyz"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: "8px 14px",
            background: "#2563eb",
            color: "white",
            borderRadius: 6,
          }}
        >
          {loading ? "Extracting…" : "Extract Product"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value as any)}
          style={{ marginLeft: "auto", padding: 6 }}
        >
          <option value="JSON">JSON</option>
          <option value="Shopify">Shopify</option>
          <option value="BigCommerce">BigCommerce</option>
        </select>
      </div>

      {err && <div style={{ color: "crimson" }}>{err}</div>}
    </div>
  );
}
