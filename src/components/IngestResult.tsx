"use client";
import React, { useEffect, useState } from "react";

type IngestRow = {
  id: string;
  status: string;
  created_at?: string;
  completed_at?: string | null;
  normalized_payload?: any | null;
  error?: string | null;
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
        if (!mounted) return;
        setRow(json);
        setLoading(false);
        // stop polling if job finished (status not pending)
        if (!json.status || json.status === "pending") {
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
        </div>
      )}
    </div>
  );
}
