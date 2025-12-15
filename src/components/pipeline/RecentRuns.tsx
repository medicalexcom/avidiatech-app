// path: src/components/pipeline/RecentRuns.tsx
"use client";

import React, { useEffect, useState } from "react";

type RunItem = {
  id: string;
  status?: string;
  created_at?: string;
  pipeline_id?: string;
  ingestion_id?: string;
  [k: string]: any;
};

type Props = {
  ingestionId?: string;
  pipelineId?: string;
  // optional limit or other UI props could be added later
  limit?: number;
};

export default function RecentRuns({ ingestionId, pipelineId, limit = 10 }: Props) {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    setLoading(true);
    setError(null);
    try {
      // prefer pipelineId if provided, otherwise ingestionId
      const params = new URLSearchParams();
      if (pipelineId) params.set("pipelineId", pipelineId);
      else if (ingestionId) params.set("ingestionId", ingestionId);
      if (limit) params.set("limit", String(limit));

      const url = `/api/v1/pipeline/runs?${params.toString()}`; // ensure your backend accepts these query params
      const res = await fetch(url);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error ?? `Failed to load runs (${res.status})`);
        setRuns([]);
      } else {
        // support both shapes: { ok: true, runs: [...] } or direct array
        const list = (json?.runs ?? json) as RunItem[] | any;
        if (Array.isArray(list)) setRuns(list.slice(0, limit));
        else setRuns([]);
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // reload whenever ingestionId or pipelineId changes
    if (ingestionId || pipelineId) loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionId, pipelineId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium">Recent runs</h5>
        <div className="text-xs text-slate-500">{loading ? "Refreshing…" : `${runs.length} shown`}</div>
      </div>

      <div className="space-y-2">
        {loading && (
          <>
            <div className="h-10 rounded bg-slate-100 animate-pulse" />
            <div className="h-10 rounded bg-slate-100 animate-pulse" />
          </>
        )}

        {!loading && error && <div className="text-xs text-rose-600">{error}</div>}

        {!loading && !runs.length && !error && <div className="text-xs text-slate-500">No recent runs found.</div>}

        {!loading &&
          runs.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <div className="font-medium text-sm">Run {r.id}</div>
                <div className="text-xs text-slate-500">
                  {r.pipeline_id ? `Pipeline: ${r.pipeline_id}` : ""} {r.ingestion_id ? `• Ingest: ${r.ingestion_id}` : ""} •{" "}
                  {new Date(r.created_at ?? Date.now()).toLocaleString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 inline-block">{r.status ?? "unknown"}</div>
                <div className="mt-2">
                  <a href={`/dashboard/import?pipelineRunId=${encodeURIComponent(r.id)}${ingestionId ? `&ingestionId=${encodeURIComponent(ingestionId)}` : ""}`} className="text-xs text-sky-600">
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
