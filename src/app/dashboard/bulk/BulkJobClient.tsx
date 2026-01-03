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

type ModuleRunLite = {
  module_index: number;
  module_name: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  error?: any;
  output_ref?: string | null;
};

type PipelineRunLite = {
  id: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
};

type Telemetry = {
  pipeline_run: PipelineRunLite | null;
  modules: ModuleRunLite[];
  module_summary: {
    counts: Record<string, number>;
    current: {
      module_index: number;
      module_name: string;
      status: string;
      started_at?: string | null;
      finished_at?: string | null;
      error?: any;
    } | null;
    failed: {
      module_index: number;
      module_name: string;
      status: string;
      error?: any;
    } | null;
  } | null;
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
  tries?: number | null;
  telemetry?: Telemetry;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function msBetween(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, b - a);
}

function fmtDuration(ms?: number | null) {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function safeStringify(v: any, maxLen = 1400) {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + "\n…(truncated)";
  } catch {
    return String(v);
  }
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function statusBadge(status?: string | null) {
  const s = status || "—";
  const cls =
    s === "succeeded"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : s === "failed"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : s === "running" || s === "in_progress"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : s === "queued"
            ? "bg-slate-100 text-slate-700 ring-slate-200"
            : "bg-slate-100 text-slate-700 ring-slate-200";

  return <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", cls)}>{s}</span>;
}

function extractErrorMessage(last_error: any): string | null {
  if (!last_error) return null;
  if (typeof last_error === "string") return last_error;
  if (typeof last_error?.message === "string") return last_error.message;
  return null;
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

  const [limit, setLimit] = useState<number>(200);
  const [offset, setOffset] = useState<number>(0);

  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000);

  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "in_progress" | "queued" | "succeeded">("all");
  const [search, setSearch] = useState<string>("");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const jobApiBase = useMemo(() => `/api/v1/bulk/${encodeURIComponent(bulkJobId)}`, [bulkJobId]);
  const telemetryApi = useMemo(
    () => `${jobApiBase}/items/telemetry?limit=${limit}&offset=${offset}`,
    [jobApiBase, limit, offset]
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
      // Prefer telemetry endpoint; fall back to the old endpoint if telemetry isn’t deployed yet.
      const res = await fetch(telemetryApi, { cache: "no-store" });
      if (!res.ok) {
        const fallbackUrl = `${jobApiBase}/items?limit=${limit}&offset=${offset}`;
        const fallback = await fetch(fallbackUrl, { cache: "no-store" });
        if (!fallback.ok) {
          const j = await fallback.json().catch(() => null);
          throw new Error(j?.error ?? `Failed to fetch items (${fallback.status})`);
        }
        const j = await fallback.json();
        setItems(j?.data ?? j ?? []);
        return;
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
  }, [bulkJobId, offset, limit]);

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
  }, [bulkJobId, autoPoll, offset, limit, pollIntervalMs]);

  const total = job?.total_items ?? items?.length ?? 0;
  const completed = job?.completed_items ?? items.filter((i) => i.status === "succeeded").length;
  const failed = job?.failed_items ?? items.filter((i) => i.status === "failed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const queued = Math.max(0, (total ?? 0) - (completed ?? 0) - (failed ?? 0) - (inProgress ?? 0));
  const pct = total ? Math.round(((completed ?? 0) / total) * 100) : 0;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${it.input_url} ${it.ingestion_id || ""} ${it.pipeline_run_id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, statusFilter, search]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) || null;
  }, [items, selectedId]);

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
  function openPipelineOutput(pipelineRunId?: string | null, moduleIndex = 0) {
    if (!pipelineRunId) return;
    window.open(`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${moduleIndex}`, "_blank");
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("Copied to clipboard");
      setTimeout(() => setActionMessage(null), 1500);
    } catch {
      // ignore
    }
  }

  function renderModuleStrip(mods: ModuleRunLite[]) {
    if (!mods || mods.length === 0) return <span className="text-xs text-slate-400">—</span>;

    return (
      <div className="flex items-center gap-1">
        {mods
          .slice()
          .sort((a, b) => a.module_index - b.module_index)
          .map((m) => {
            const cls =
              m.status === "succeeded"
                ? "bg-emerald-500"
                : m.status === "failed"
                  ? "bg-rose-500"
                  : m.status === "running"
                    ? "bg-amber-500"
                    : m.status === "skipped"
                      ? "bg-slate-300"
                      : "bg-slate-200";
            return <span key={m.module_index} className={classNames("h-2 w-4 rounded", cls)} title={`${m.module_index}:${m.module_name}:${m.status}`} />;
          })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulk job dashboard</h1>
          <div className="mt-1 text-sm text-slate-600">
            Job id: <span className="font-mono">{bulkJobId || "—"}</span>
            {bulkJobId ? (
              <button className="ml-2 text-xs underline text-sky-700" onClick={() => copyToClipboard(bulkJobId)}>
                copy
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
            Auto refresh
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-600">Interval</span>
            <select className="rounded-md border bg-white px-2 py-2 text-sm" value={pollIntervalMs} onChange={(e) => setPollIntervalMs(parseInt(e.target.value, 10))}>
              <option value={1000}>1s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          </label>

          <button onClick={downloadErrors} className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white" disabled={!bulkJobId}>
            Download errors CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">{actionMessage}</div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Progress</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="text-2xl font-semibold">{pct}%</div>
            <div className="text-xs text-slate-500">{completed}/{total} done</div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Job status: {statusBadge(job?.status ?? "—")}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Counts (page)</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border p-2">
              <div className="text-xs text-slate-500">Succeeded</div>
              <div className="text-lg font-semibold text-emerald-700">{completed}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-xs text-slate-500">Failed</div>
              <div className="text-lg font-semibold text-rose-700">{failed}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-xs text-slate-500">In progress</div>
              <div className="text-lg font-semibold text-amber-700">{inProgress}</div>
            </div>
            <div className="rounded-lg border p-2">
              <div className="text-xs text-slate-500">Queued</div>
              <div className="text-lg font-semibold text-slate-700">{queued}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Telemetry</div>
          <div className="mt-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Endpoint</span>
              <span className="font-mono text-xs">/items/telemetry</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Adds pipeline + module status per item.
            </div>
          </div>
          <div className="mt-3">
            <button className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm text-white" onClick={fetchItems} disabled={!bulkJobId}>
              Refresh telemetry now
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Actions</div>
          <div className="mt-3 space-y-2">
            <button className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={retryFailedItems} disabled={failed === 0}>
              Retry failed items
            </button>
            <button className="w-full rounded-md border bg-white px-3 py-2 text-sm" onClick={() => { fetchJob(); fetchItems(); }}>
              Refresh now
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs text-slate-500">Items</div>
              <div className="text-sm text-slate-700">
                Showing <span className="font-semibold">{filteredItems.length}</span> / {items.length} (offset {offset}, limit {limit})
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input className="rounded-md border px-3 py-2 text-sm w-[260px]" placeholder="Search URL / IDs" value={search} onChange={(e) => setSearch(e.target.value)} />

              <select className="rounded-md border bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All statuses</option>
                <option value="failed">Failed</option>
                <option value="in_progress">In progress</option>
                <option value="queued">Queued</option>
                <option value="succeeded">Succeeded</option>
              </select>

              <select className="rounded-md border bg-white px-3 py-2 text-sm" value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10))}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Pipeline</th>
                  <th className="py-2 pr-3">Modules</th>
                  <th className="py-2 pr-3">Timing</th>
                  <th className="py-2 pr-3">Error</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loadingItems ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={8}>
                      Loading items…
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={8}>
                      No items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => {
                    const dur = msBetween(it.started_at, it.finished_at);
                    const isExpanded = Boolean(expanded[it.id]);
                    const isSelected = selectedId === it.id;

                    const pipe = it.telemetry?.pipeline_run ?? null;
                    const modSummary = it.telemetry?.module_summary ?? null;
                    const mods = it.telemetry?.modules ?? [];

                    return (
                      <React.Fragment key={it.id}>
                        <tr
                          className={classNames("border-t hover:bg-slate-50 cursor-pointer", isSelected && "bg-sky-50")}
                          onClick={() => setSelectedId(it.id)}
                        >
                          <td className="py-2 pr-3 align-top">{it.item_index + 1}</td>

                          <td className="py-2 pr-3 align-top max-w-[44ch]">
                            <div className="truncate">{it.input_url}</div>
                            <div className="mt-1 text-xs text-slate-400 font-mono">id: {it.id.slice(0, 8)}…</div>
                          </td>

                          <td className="py-2 pr-3 align-top">
                            <div className="flex items-center gap-2">
                              {statusBadge(it.status)}
                              <span className="text-xs text-slate-500 font-mono">tries:{it.tries ?? "—"}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              ingestion:{" "}
                              {it.ingestion_id ? (
                                <button className="underline text-sky-700 font-mono" onClick={(e) => { e.stopPropagation(); openExtract(it.ingestion_id); }}>
                                  {it.ingestion_id.slice(0, 10)}…
                                </button>
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>

                          <td className="py-2 pr-3 align-top">
                            {it.pipeline_run_id ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {statusBadge(pipe?.status ?? "—")}
                                  <button
                                    className="text-xs underline text-sky-700 font-mono"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPipelineOutput(it.pipeline_run_id, 0);
                                    }}
                                  >
                                    {it.pipeline_run_id.slice(0, 10)}…
                                  </button>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  current:{" "}
                                  <span className="font-mono">
                                    {modSummary?.current ? `${modSummary.current.module_index}:${modSummary.current.module_name}:${modSummary.current.status}` : "—"}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-2 pr-3 align-top">
                            {mods.length ? (
                              <div className="space-y-2">
                                {renderModuleStrip(mods)}
                                <div className="text-[11px] text-slate-500 font-mono">
                                  ok:{modSummary?.counts?.succeeded ?? 0} run:{modSummary?.counts?.running ?? 0} q:{modSummary?.counts?.queued ?? 0} fail:{modSummary?.counts?.failed ?? 0} skip:{modSummary?.counts?.skipped ?? 0}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-2 pr-3 align-top">
                            <div className="text-xs text-slate-700 font-mono">{fmtDuration(dur)}</div>
                            <div className="text-[11px] text-slate-400">start: {fmtDate(it.started_at)}</div>
                          </td>

                          <td className="py-2 pr-3 align-top">
                            {it.last_error ? (
                              <div className="max-w-[34ch] truncate text-xs text-rose-700">
                                {extractErrorMessage(it.last_error) || safeStringify(it.last_error, 220)}
                              </div>
                            ) : modSummary?.failed?.error ? (
                              <div className="max-w-[34ch] truncate text-xs text-rose-700">
                                {safeStringify(modSummary.failed.error, 220)}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-2 pr-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-2">
                              <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openExtract(it.ingestion_id)} disabled={!it.ingestion_id}>
                                Extract
                              </button>
                              <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openPipelineOutput(it.pipeline_run_id, 0)} disabled={!it.pipeline_run_id}>
                                Out 0
                              </button>
                              <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openPipelineOutput(it.pipeline_run_id, 1)} disabled={!it.pipeline_run_id}>
                                Out 1
                              </button>
                              <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => setExpanded((s) => ({ ...s, [it.id]: !s[it.id] }))}>
                                {isExpanded ? "Hide" : "Details"}
                              </button>
                              <button className="rounded px-2 py-1 text-xs bg-amber-400 text-slate-900 disabled:opacity-50" disabled={retryingIds[it.id] || it.status !== "failed"} onClick={() => retryItem(it.id)}>
                                {retryingIds[it.id] ? "Retrying…" : "Retry"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr className="border-t bg-slate-50">
                            <td colSpan={8} className="p-3">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-lg border bg-white p-3">
                                  <div className="text-xs text-slate-500 mb-2">Telemetry (raw)</div>
                                  <pre className="text-xs whitespace-pre-wrap break-all max-h-[260px] overflow-auto rounded border bg-slate-50 p-2">
                                    {it.telemetry ? safeStringify(it.telemetry) : "—"}
                                  </pre>
                                </div>
                                <div className="rounded-lg border bg-white p-3">
                                  <div className="text-xs text-slate-500 mb-2">Last error (raw)</div>
                                  <pre className="text-xs whitespace-pre-wrap break-all max-h-[260px] overflow-auto rounded border bg-slate-50 p-2">
                                    {it.last_error ? safeStringify(it.last_error) : "—"}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <button className="rounded px-2 py-1 border" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
                Prev
              </button>
              <button className="rounded px-2 py-1 border" onClick={() => setOffset(offset + limit)} disabled={items.length < limit}>
                Next
              </button>
              <div className="text-xs text-slate-500">offset {offset}</div>
            </div>
            <div className="text-xs text-slate-500">
              Updated: {fmtDate(job?.updated_at)} {loadingJob || loadingItems ? "(refreshing…)" : ""}
            </div>
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-4">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Selection</h3>
              {selectedItem ? (
                <button className="text-xs underline text-sky-700" onClick={() => copyToClipboard(selectedItem.id)}>
                  copy item id
                </button>
              ) : null}
            </div>

            {selectedItem ? (
              <div className="mt-2 space-y-3">
                <div className="text-sm">
                  <div className="text-xs text-slate-500">URL</div>
                  <div className="break-words">{selectedItem.input_url}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border p-2">
                    <div className="text-slate-500">Item</div>
                    <div className="mt-1">{statusBadge(selectedItem.status)}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-slate-500">Pipeline</div>
                    <div className="mt-1">{statusBadge(selectedItem.telemetry?.pipeline_run?.status ?? (selectedItem.pipeline_run_id ? "—" : "—"))}</div>
                  </div>
                </div>

                <details>
                  <summary className="cursor-pointer text-xs text-slate-600">Module runs</summary>
                  <div className="mt-2 space-y-2">
                    {(selectedItem.telemetry?.modules ?? []).map((m) => (
                      <div key={m.module_index} className="flex items-center justify-between rounded border bg-white px-2 py-1">
                        <span className="text-xs font-mono">{m.module_index}:{m.module_name}</span>
                        <span>{statusBadge(m.status)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                <details>
                  <summary className="cursor-pointer text-xs text-slate-600">Raw telemetry</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-all max-h-[320px] overflow-auto rounded border bg-slate-50 p-2">
                    {selectedItem.telemetry ? safeStringify(selectedItem.telemetry) : "—"}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-600">Click a row to inspect details.</div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Job details</h3>
            <div className="mt-3 text-sm text-slate-700 space-y-1">
              <div><span className="text-slate-500">Name:</span> {job?.name ?? "—"}</div>
              <div><span className="text-slate-500">Status:</span> {job?.status ?? "—"}</div>
              <div><span className="text-slate-500">Created by:</span> <span className="font-mono">{job?.created_by ?? "—"}</span></div>
              <div><span className="text-slate-500">Created:</span> {fmtDate(job?.created_at)}</div>
              <div><span className="text-slate-500">Updated:</span> {fmtDate(job?.updated_at)}</div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-slate-600">Options</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap break-all max-h-[220px] overflow-auto rounded border bg-slate-50 p-2">
                {job?.options ? safeStringify(job.options) : "—"}
              </pre>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
