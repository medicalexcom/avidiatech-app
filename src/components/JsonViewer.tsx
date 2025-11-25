"use client";
import React from "react";

export default function JsonViewer({ data, loading }: { data: any; loading?: boolean }) {
  const json = data || {};

  function download() {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `normalized_payload.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      alert("Copied JSON to clipboard");
    } catch {
      alert("Copy failed");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={copyToClipboard}>Copy JSON</button>
        <button onClick={download}>Download JSON</button>
      </div>

      <pre style={{ maxHeight: "70vh", overflow: "auto", whiteSpace: "pre-wrap", background: "#111827", color: "#f9fafb", padding: 12, borderRadius: 6 }}>
        {loading ? "Waiting for JSON…" : JSON.stringify(json, null, 2)}
      </pre>
    </div>
  );
}
