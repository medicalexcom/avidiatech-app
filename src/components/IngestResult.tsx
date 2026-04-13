"use client";
import React, { useEffect, useState } from "react";

type IngestRow = {
  id: string;
  status: string;
  created_at?: string;
  completed_at?: string | null;
  normalized_payload?: any | null;
  error?: string | null;
  flags?: any;
  options?: any;
};

type Props = {
  jobId: string;
  pollIntervalMs?: number;
  onClose?: () => void;
};

export default function IngestResult({ jobId, pollIntervalMs = 1500, onClose }: Props) {
  const [row, setRow] = useState<IngestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [reprocessMessage, setReprocessMessage] = useState<string | null>(null);

  // Reprocess module toggles
  const [reqSeo, setReqSeo] = useState(false);
  const [reqSpecs, setReqSpecs] = useState(false);
  const [reqDocs, setReqDocs] = useState(false);
  const [reqVariants, setReqVariants] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`status fetch failed: ${res.status} ${text}`);
        }
        const json = await res.json();
        // Support both wrapped and direct responses (backwards compatibility)
        const data = (json && json.job) ? json.job : json;
        if (!mounted) return;
        setRow(data);
        setLoading(false);
        // stop polling if job finished (status not pending)
        if (!data.status || data.status === "pending") {
          timer = window.setTimeout(fetchStatus, pollIntervalMs);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(String(e.message || e));
        setLoading(false);
        // try again if transient
        timer = window.setTimeout(fetchStatus, pollIntervalMs * 2);
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, pollIntervalMs]);

  const downloadJson = () => {
    if (!row?.normalized_payload) return;
    const blob = new Blob([JSON.stringify(row.normalized_payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingest-${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doReprocess = async () => {
    if (!reqSeo && !reqSpecs && !reqDocs && !reqVariants) {
      setReprocessMessage("Select at least one module to reprocess.");
      return;
    }
    setReprocessLoading(true);
    setReprocessMessage(null);
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(jobId)}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            includeSeo: reqSeo,
            includeSpecs: reqSpecs,
            includeDocs: reqDocs,
            includeVariants: reqVariants,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setReprocessMessage(`Reprocess request failed: ${JSON.stringify(json)}`);
      } else {
        setReprocessMessage(`Reprocess submitted: ${JSON.stringify(json)}`);
      }
    } catch (err: any) {
      setReprocessMessage(`Reprocess failed: ${String(err?.message || err)}`);
    } finally {
      setReprocessLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Ingest job: {jobId}</h3>
        <div>
          <button onClick={() => { if (onClose) onClose(); }} style={{ marginRight: 8 }}>
            Close
          </button>
          <button onClick={downloadJson} disabled={!row?.normalized_payload}>
            Download JSON
          </button>
        </div>
      </div>

      {loading && <p>Loading status…</p>}
      {err && <pre style={{ color: "red" }}>{err}</pre>}

      {row && (
        <div>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Created:</strong> {row.created_at}</p>
          <p><strong>Completed:</strong> {row.completed_at ?? "—"}</p>

          <h4>Normalized payload</h4>
          {row.normalized_payload ? (
            <pre style={{ whiteSpace: "pre-wrap", background: "#f8f8f8", padding: 12, borderRadius: 6 }}>
              {JSON.stringify(row.normalized_payload, null, 2)}
            </pre>
          ) : (
            <p>No normalized payload yet.</p>
          )}

          {row.error && (
            <>
              <h4>Error</h4>
              <pre style={{ color: "crimson" }}>{String(row.error)}</pre>
            </>
          )}

          <hr style={{ margin: "16px 0" }} />

          <h4>Run additional modules on this job</h4>
          <p className="text-sm text-gray-600">If you didn't generate a module initially, enable it below to run it on the saved raw extraction (no re-scrape when possible).</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 8 }}>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={reqSeo} onChange={() => setReqSeo(!reqSeo)} />
              <span>Include SEO</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={reqSpecs} onChange={() => setReqSpecs(!reqSpecs)} />
              <span>Include Specs</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={reqDocs} onChange={() => setReqDocs(!reqDocs)} />
              <span>Include Manuals / PDFs</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={reqVariants} onChange={() => setReqVariants(!reqVariants)} />
              <span>Generate Variants</span>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={doReprocess} disabled={reprocessLoading} className="px-3 py-2 bg-indigo-600 text-white rounded">
              {reprocessLoading ? "Submitting…" : "Run selected modules"}
            </button>
            {reprocessMessage && <div style={{ marginTop: 8, color: "#444" }}>{reprocessMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
