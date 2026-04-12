"use client";
import React, { useState } from "react";
import IngestResult from "@/components/IngestResult";

export default function IntegrateIngestResultExample() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  async function onSubmitIngest(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          options: {},
          correlation_id: `corr_${Date.now()}`,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        console.error("ingest failed", payload);
        alert(`Ingest request failed: ${payload?.error || res.status}`);
        return;
      }
      const id = payload.jobId || payload.jobId || payload.jobId;
      setJobId(id);
      setShow(true);
    } catch (err) {
      console.error(err);
      alert("Failed to call ingest endpoint");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmitIngest} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/product/..."
          style={{ flex: 1, padding: "8px 12px" }}
          required
        />
        <button type="submit" disabled={submitting || !sourceUrl}>
          {submitting ? "Submitting…" : "Extract"}
        </button>
      </form>

      {show && jobId && (
        <div style={{ marginTop: 20, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Ingest job {jobId}</h4>
            <button onClick={() => setShow(false)}>Close</button>
          </div>
          <IngestResult jobId={jobId} onClose={() => setShow(false)} />
        </div>
      )}
    </div>
  );
}
