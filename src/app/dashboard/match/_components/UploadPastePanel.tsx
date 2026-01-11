"use client";
import React, { useState } from "react";
import { parsePasteOrCsv } from "@/lib/match/normalize";

export default function UploadPastePanel() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit() {
    setSubmitting(true);
    const { items, warnings } = parsePasteOrCsv(text);
    setWarnings(warnings);
    try {
      const res = await fetch("/api/v1/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items })
      });
      const json = await res.json();
      if (json.jobId) setJobId(json.jobId);
      // TODO: start polling GET /api/v1/match/{jobId}
    } catch (err) {
      console.error(err);
      alert("submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
      <h3>Upload or Paste SKUs</h3>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} style={{ width: "100%" }} placeholder="sku,brand,gtin per line" />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleSubmit} disabled={submitting}>Submit</button>
        {jobId && <span style={{ marginLeft: 12 }}>Job: {jobId}</span>}
      </div>
      {warnings.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong>Warnings:</strong>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
