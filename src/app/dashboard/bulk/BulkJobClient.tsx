"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type BulkJob = {
  id: string;
  name?: string | null;
  created_by?: string | null;
  total_items?: number | null;
  completed_items?: number | null;
  failed_items?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  options?: any;
};

type BulkItem = {
  id: string;
  item_index: number;
  input_url: string;
  metadata?: any;
  status?: string;
  ingestion_id?: string | null;
  pipeline_run_id?: string | null;
  last_error?: any;
  started_at?: string | null;
  finished_at?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function BulkJobClient(props: {
  initialBulkJobId?: string;
  initialJob?: BulkJob | null;
  initialItems?: BulkItem[];
  initialError?: string | null;
}) {
  const params = useSearchParams();
  const bulkJobId = params?.get("bulkJobId") || props.initialBulkJobId || "";

  const [job, setJob] = useState<BulkJob | null>(props.initialJob ?? null);
  const [items, setItems] = useState<BulkItem[]>(props.initialItems ?? []);
  const [loadingJob, setLoadingJob] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(props.initialError ?? null);

  const [limit] = useState<number>(200);
  const [offset, setOffset] = useState<number>(0);

  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [pollIntervalMs] = useState<number>(3000);

  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const jobApiBase = useMemo(
    () => `/api/v1/bulk/${encodeURIComponent(bulkJobId)}`,
    [bulkJobId]
  );

  async function fetchJob() {
    if (!bulkJobId) return;
    setLoadingJob(true);
    setError(null);
    try {
      const res = await fetch(jobApiBase, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Failed to fetch job (${res.status})`);
      }
      const j = await res.json();
      setJob(j?.data ?? j);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingJob(false);
    }
  }

  async function fetchItems() {
    if (!bulkJobId) return;
    setLoadingItems(true);
    setError(null);
    try {
      const url = `${jobApiBase}/items?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Failed to fetch items (${res.status})`);
      }
      const j = await res.json();
      setItems(j?.data ?? j ?? []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    if (!bulkJobId) return;
    fetchJob();
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobId, offset]);

  useEffect(() => {
    if (!bulkJobId || !autoPoll) return;
    let mounted = true;
    const t = setInterval(async () => {
      if (!mounted) return;
      await fetchJob();
      await fetchItems();
    }, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobId, autoPoll, offset, pollIntervalMs]);

  const total = job?.total_items ?? items?.length ?? 0;
  const completed =
    job?.completed_items ?? items.filter((i) => i.status === "succeeded").length;
  const failed =
    job?.failed_items ?? items.filter((i) => i.status === "failed").length;
  const queued = Math.max(0, (total ?? 0) - (completed ?? 0) - (failed ?? 0));
  const pct = total ? Math.round(((completed ?? 0) / total) * 100) : 0;

  async function downloadErrors() {
    if (!bulkJobId) return;
    window.open(`${jobApiBase}/items/errors`, "_blank");
  }

  async function retryItem(itemId: string) {
    if (!bulkJobId || !itemId) return;
    setRetryingIds((s) => ({ ...s, [itemId]: true }));
    setActionMessage(null);
    try {
      const url = `${jobApiBase}/items/${encodeURIComponent(itemId)}/retry`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Retry failed (${res.status})`);
      }
      setActionMessage("Item re-enqueued");
      await fetchItems();
      await fetchJob();
    } catch (e: any) {
      setActionMessage(String(e?.message || e));
    } finally {
      setRetryingIds((s) => {
        const next = { ...s };
        delete next[itemId];
        return next;
      });
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  async function retryFailedItems() {
    if (!bulkJobId) return;
    setActionMessage(null);
    try {
      const url = `${jobApiBase}/retry-failed`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Retry failed (${res.status})`);
      }
      setActionMessage("Failed items enqueued for retry");
      await fetchItems();
      await fetchJob();
    } catch (e: any) {
      setActionMessage(String(e?.message || e));
    } finally {
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  function openExtract(ingestionId?: string | null) {
    if (!ingestionId) return;
    window.open(`/dashboard/extract?ingestionId=${encodeURIComponent(ingestionId)}`, "_blank");
  }
  function openDescribe(ingestionId?: string | null) {
    if (!ingestionId) return;
    window.open(`/dashboard/describe?ingestionId=${encodeURIComponent(ingestionId)}`, "_blank");
  }
  function openMonitor(ingestionId?: string | null) {
    if (!ingestionId) return;
    window.open(`/dashboard/monitor?ingestionId=${encodeURIComponent(ingestionId)}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Bulk job</h1>
          <div className="mt-1 text-sm text-slate-600">
            Job id: <span className="font-mono">{bulkJobId || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchJob();
              fetchItems();
            }}
            className="rounded-md border px-3 py-2 text-sm bg-white"
            disabled={!bulkJobId || loadingJob || loadingItems}
          >
            Refresh
          </button>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
            />
            Auto refresh
          </label>

          <button
            onClick={downloadErrors}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white"
            disabled={!bulkJobId}
            title="Download CSV of failed items"
          >
            Download errors CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Summary</div>
                <h2 className="text-lg font-semibold">{job?.name ?? "Bulk job"}</h2>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Created</div>
                <div className="font-mono text-sm">{fmtDate(job?.created_at)}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="rounded-lg border px-3 py-2 text-sm">
                  Total: <span className="font-semibold ml-2">{total ?? "—"}</span>
                </div>
                <div className="rounded-lg border px-3 py-2 text-sm">
                  Completed: <span className="font-semibold ml-2">{completed ?? 0}</span>
                </div>
                <div className="rounded-lg border px-3 py-2 text-sm">
                  Failed: <span className="font-semibold ml-2">{failed ?? 0}</span>
                </div>
                <div className="rounded-lg border px-3 py-2 text-sm">
                  Queued: <span className="font-semibold ml-2">{queued ?? 0}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-3 w-full rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-slate-500">Progress: {pct}%</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Items</h3>
              <div className="text-xs text-slate-500">
                Showing {items.length} items (offset {offset})
              </div>
            </div>

            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">URL</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Ingestion</th>
                    <th className="py-2 pr-3">Pipeline</th>
                    <th className="py-2 pr-3">Error</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingItems ? (
                    <tr>
                      <td className="py-4 text-sm text-slate-500" colSpan={7}>
                        Loading items…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="py-4 text-sm text-slate-500" colSpan={7}>
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="py-2 pr-3 align-top">{it.item_index + 1}</td>
                        <td className="py-2 pr-3 align-top max-w-[36ch] truncate">
                          {it.input_url}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                              it.status === "succeeded"
                                ? "bg-emerald-50 text-emerald-700"
                                : it.status === "failed"
                                  ? "bg-rose-50 text-rose-700"
                                  : it.status === "in_progress"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-700",
                            ].join(" ")}
                          >
                            {it.status ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          {it.ingestion_id ? (
                            <button
                              className="text-xs text-sky-700 underline"
                              onClick={() => openExtract(it.ingestion_id)}
                            >
                              {it.ingestion_id.slice(0, 10)}…
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          {it.pipeline_run_id ? (
                            <a
                              className="text-xs underline"
                              href={`/api/v1/pipeline/run/${encodeURIComponent(
                                it.pipeline_run_id
                              )}/output/0`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {it.pipeline_run_id.slice(0, 10)}…
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          {it.last_error ? (
                            <div className="max-w-[28ch] truncate text-xs text-rose-700">
                              {typeof it.last_error === "string"
                                ? it.last_error
                                : JSON.stringify(it.last_error)}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded px-2 py-1 text-xs border bg-white"
                              onClick={() => openExtract(it.ingestion_id)}
                              disabled={!it.ingestion_id}
                            >
                              Open Extract
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs border bg-white"
                              onClick={() => openDescribe(it.ingestion_id)}
                              disabled={!it.ingestion_id}
                            >
                              Open Describe
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs border bg-white"
                              onClick={() => openMonitor(it.ingestion_id)}
                              disabled={!it.ingestion_id}
                            >
                              Open Monitor
                            </button>

                            <button
                              className="rounded px-2 py-1 text-xs bg-amber-400 text-slate-900"
                              disabled={retryingIds[it.id] || it.status !== "failed"}
                              onClick={() => retryItem(it.id)}
                            >
                              {retryingIds[it.id] ? "Retrying…" : "Retry"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <button
                  className="rounded px-2 py-1 border"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded px-2 py-1 border"
                  onClick={() => setOffset(offset + limit)}
                  disabled={items.length < limit}
                >
                  Next
                </button>
                <div className="text-xs text-slate-500">offset {offset}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded px-3 py-2 bg-sky-600 text-white text-sm"
                  onClick={retryFailedItems}
                  disabled={failed === 0}
                >
                  Retry failed items
                </button>
                {actionMessage ? (
                  <div className="text-sm text-slate-600">{actionMessage}</div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Job details</h3>
            <div className="mt-3 text-sm text-slate-700">
              <div>
                <strong>Name:</strong> {job?.name ?? "—"}
              </div>
              <div>
                <strong>Created by:</strong>{" "}
                <span className="font-mono">{job?.created_by ?? "—"}</span>
              </div>
              <div>
                <strong>Created:</strong> {fmtDate(job?.created_at)}
              </div>
              <div>
                <strong>Updated:</strong> {fmtDate(job?.updated_at)}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <button
                className="w-full rounded px-3 py-2 bg-sky-600 text-white"
                onClick={downloadErrors}
                disabled={!bulkJobId}
              >
                Download failed rows CSV
              </button>
              <button
                className="w-full rounded px-3 py-2 bg-white border text-sm"
                onClick={() => {
                  fetchJob();
                  fetchItems();
                }}
              >
                Refresh now
              </button>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Diagnostics</h3>
            <div className="mt-2 text-xs text-slate-600">
              Failed rows will appear here and can be downloaded for inspection.
              If items are stuck, check worker logs and Redis connectivity.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
