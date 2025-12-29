"use client";

import React, { useEffect, useState } from "react";

type Props = {
  ingestionId?: string | null;
  pipelineId?: string | null;
  limit?: number;
};

/**
 * RecentRuns
 *
 * Robust UI for showing recent pipeline runs. Defensive against server-side DB schema differences
 * (e.g. missing pipeline_runs.ingestion_id column) which may surface as `db_lookup_failed` or SQL
 * errors from the API. If a filtered fetch by ingestionId fails due to DB lookup errors, this
 * component will retry a safe unfiltered fetch so the page still renders.
 *
 * This component is intentionally lightweight and only depends on the public API:
 * - GET /api/v1/pipeline/runs?ingestionId=...
 * - GET /api/v1/pipeline/runs?pipelineId=...
 * - GET /api/v1/pipeline/runs
 *
 * It handles multiple response shapes: { ok, runs } or directly an array.
 */
export default function RecentRuns({ ingestionId, pipelineId, limit = 6 }: Props) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setUsedFallback(false);

    async function fetchRuns() {
      setLoading(true);
      setRuns([]);
      setError(null);

      // Build the initial URL: prefer ingestionId filter, then pipelineId, otherwise no filter
      const q = ingestionId ? `?ingestionId=${encodeURIComponent(ingestionId)}` : pipelineId ? `?pipelineId=${encodeURIComponent(pipelineId)}` : "";
      const url = `/api/v1/pipeline/runs${q}`;

      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          // Defensive: if server returns an error about missing column (db_lookup_failed or ingestion_id)
          const msg = String(json?.error ?? json?.message ?? json ?? res.statusText ?? "");
          if (/ingestion_id|db_lookup_failed|column .* does not exist/i.test(msg)) {
            // Retry without filtering to allow UI to still show runs
            const fallbackUrl = `/api/v1/pipeline/runs`;
            const fallbackRes = await fetch(fallbackUrl);
            const fallbackJson = await fallbackRes.json().catch(() => null);
            if (!fallbackRes.ok) {
              const fallbackMsg = String(fallbackJson?.error ?? fallbackJson?.message ?? fallbackRes.statusText ?? "");
              if (mounted) setError(`Failed to load recent runs: ${fallbackMsg}`);
            } else {
              const list = Array.isArray(fallbackJson) ? fallbackJson : fallbackJson?.runs ?? fallbackJson?.data ?? [];
              if (mounted) {
                setRuns(list.slice(0, limit));
                setUsedFallback(true);
              }
            }
          } else {
            if (mounted) setError(`Failed to load recent runs: ${msg}`);
          }
        } else {
          // Success case - normalize array shapes
          const list = Array.isArray(json) ? json : json?.runs ?? json?.data ?? [];
          if (mounted) setRuns((list ?? []).slice(0, limit));
        }
      } catch (err: any) {
        if (mounted) setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRuns();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionId, pipelineId, limit]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(Math.min(limit, 3))].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        <div className="font-medium">Recent runs unavailable</div>
        <div className="text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div className="font-medium">No recent runs</div>
        <div className="text-xs mt-1">No pipeline runs were found yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {usedFallback ? (
        <div className="text-xs text-slate-500 italic">Filtered query failed — showing recent runs (unfiltered).</div>
      ) : null}
      {runs.map((r: any) => {
        // Defensive accessors for common run fields
        const id = r?.id ?? r?.run_id ?? r?.pipeline_run_id ?? "";
        const status = (r?.status ?? r?.state ?? "unknown").toString();
        // ingestion id might be in different places or not present
        const ingestion = r?.ingestion_id ?? r?.ingestionId ?? (r?.data?.ingestion_id ?? r?.data?.id) ?? null;
        const created = r?.created_at ?? r?.created ?? r?.ts ?? null;

        return (
          <div
            key={id ?? Math.random()}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {id ? String(id).slice(0, 10) : "run"}
                <span className="ml-2 text-xs text-slate-500">· {status}</span>
              </div>
              <div className="text-xs text-slate-500">
                Ingestion: <span className="font-mono">{ingestion ? String(ingestion) : "—"}</span>
                {created ? <span className="ml-3">Created: {new Date(created).toLocaleString()}</span> : null}
              </div>
            </div>

            <div className="shrink-0 text-xs text-slate-500">
              <a
                href={`/dashboard/import?ingestionId=${encodeURIComponent(String(ingestion ?? ""))}&pipelineRunId=${encodeURIComponent(
                  String(id ?? "")
                )}`}
                className="text-xs text-slate-600 hover:underline"
                onClick={(e) => {
                  // if ingestion is empty, prevent navigation to avoid blank queries
                  if (!ingestion) {
                    e.preventDefault();
                    return;
                  }
                }}
              >
                View
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
