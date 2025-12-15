"use client";

import React, { useEffect, useState } from "react";

/**
 * RecentRuns shows last N pipeline runs for a given ingestionId.
 * Calls GET /api/v1/pipeline/runs?ingestionId=<id>
 * The route should return { ok: true, runs: [...] }
 */

export default function RecentRuns({ ingestionId }: { ingestionId: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ingestionId) return;
    setLoading(true);
    fetch(`/api/v1/pipeline/runs?ingestionId=${encodeURIComponent(ingestionId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) throw new Error(json?.error ?? "Failed to load");
        setRuns(json.runs ?? []);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [ingestionId]);

  return (
    <div>
      <h4 className="text-sm font-semibold">Recent runs</h4>
      {loading && <div className="text-xs">Loading…</div>}
      {error && <div className="text-xs text-rose-600">{error}</div>}
      {!loading && !error && runs.length === 0 && <div className="text-xs text-slate-500">No recent runs</div>}
      <ul className="mt-2 space-y-2 text-xs">
        {runs.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border p-2">
            <div>
              <div className="font-medium">{r.status} — {new Date(r.created_at).toLocaleString()}</div>
              <div className="text-xs text-slate-500">Run id: {String(r.id).slice(0, 8)}… duration: {r.duration_ms ? `${Math.round(r.duration_ms / 1000)}s` : "—"}</div>
            </div>
            <div className="flex gap-2">
              <a href={`/dashboard/import?ingestionId=${encodeURIComponent(r.ingestion_id)}&pipelineRunId=${encodeURIComponent(r.id)}`} className="text-xs px-2 py-1 border rounded">View</a>
              <button onClick={() => fetch(`/api/v1/pipeline/run/${encodeURIComponent(r.id)}/retry`, { method: "POST" }).then(()=>alert("Retry requested"))} className="text-xs px-2 py-1 bg-slate-50 border rounded">Retry</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
