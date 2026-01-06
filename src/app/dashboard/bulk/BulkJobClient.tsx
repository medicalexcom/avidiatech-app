"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
          : s === "queued" || s === "pending"
            ? "bg-slate-100 text-slate-700 ring-slate-200"
            : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", cls)}>
      {s}
    </span>
  );
}

/**
 * Improved error extraction:
 * - Avoids "[object Object]"
 * - Supports bulk worker normalized error shape:
 *    { message, payload: { error: { message, code, issues } ... } }
 */
function extractErrorMessage(last_error: any): string | null {
  if (!last_error) return null;

  if (typeof last_error === "string") return last_error;

  if (typeof last_error?.message === "string" && last_error.message.trim()) return last_error.message;
  if (typeof last_error?.error === "string" && last_error.error.trim()) return last_error.error;

  const nested =
    last_error?.payload?.error?.message ||
    last_error?.payload?.message ||
    last_error?.payload?.error ||
    last_error?.detail;

  if (typeof nested === "string" && nested.trim()) return nested;

  if (typeof last_error?.payload?.error?.code === "string" && last_error.payload.error.code.trim()) {
    const msg = last_error?.payload?.error?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
    return last_error.payload.error.code;
  }

  return null;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildSeoPreviewHtmlDoc(opts: {
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  descriptionHtml?: string | null;
}) {
  const title = opts.title || "SEO Preview";
  const metaDescription = opts.metaDescription || "";
  const h1 = opts.h1 || "";

  const body = `
  <div style="max-width: 980px; margin: 24px auto; padding: 0 16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a;">
    <div style="margin-bottom: 12px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Meta preview</div>
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">${escapeHtml(title)}</div>
      ${
        metaDescription
          ? `<div style="font-size: 13px; color: #334155;">${escapeHtml(metaDescription)}</div>`
          : `<div style="font-size: 13px; color: #94a3b8;">(no meta description)</div>`
      }
    </div>

    ${
      h1
        ? `<h1 style="font-size: 28px; line-height: 1.2; margin: 18px 0 12px;">${escapeHtml(h1)}</h1>`
        : ""
    }

    <div class="seo-description">
      ${opts.descriptionHtml || "<p>(no description_html)</p>"}
    </div>
  </div>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${metaDescription ? `<meta name="description" content="${escapeHtml(metaDescription)}" />` : ""}
  <style>
    .seo-description p { margin: 0.75rem 0; }
    .seo-description ul, .seo-description ol { padding-left: 1.25rem; margin: 0.75rem 0; }
    .seo-description h2 { margin: 1.5rem 0 0.75rem; font-size: 20px; }
    .seo-description h3 { margin: 1.25rem 0 0.5rem; font-size: 16px; }
    .seo-description a { color: #0369a1; text-decoration: underline; }
    .seo-description table { border-collapse: collapse; width: 100%; }
    .seo-description td, .seo-description th { border: 1px solid #e2e8f0; padding: 8px; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function tinyHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function downloadTextFile(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getSeoField(seoPayload: any, path: string): string | null {
  try {
    const parts = path.split(".");
    let cur = seoPayload;
    for (const p of parts) cur = cur?.[p];
    return typeof cur === "string" && cur.trim() ? cur : null;
  } catch {
    return null;
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

  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [limit, setLimit] = useState<number>(200);
  const [offset, setOffset] = useState<number>(0);

  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000);

  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "in_progress" | "queued" | "succeeded">("all");
  const [showOnlyQueued, setShowOnlyQueued] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"seo" | "summary" | "extract" | "out0" | "out1" | "telemetry">("seo");

  const [enginePayloadCache, setEnginePayloadCache] = useState<Record<string, any>>({});
  const [engineFullLoadingById, setEngineFullLoadingById] = useState<Record<string, boolean>>({});

  const [seoCache, setSeoCache] = useState<Record<string, any>>({});
  const [seoLoadingById, setSeoLoadingById] = useState<Record<string, boolean>>({});

  const [pipelineOutCache, setPipelineOutCache] = useState<Record<string, any>>({});
  const [pipelineOutLoading, setPipelineOutLoading] = useState<Record<string, boolean>>({});

  const selectionNonceRef = useRef(0);

  const jobApiBase = useMemo(() => `/api/v1/bulk/${encodeURIComponent(bulkJobId)}`, [bulkJobId]);
  const statsApi = useMemo(() => `${jobApiBase}/stats`, [jobApiBase]);
  const telemetryApi = useMemo(
    () => `${jobApiBase}/items/telemetry?limit=${limit}&offset=${offset}`,
    [jobApiBase, limit, offset]
  );
  const itemsApi = useMemo(
    () => `${jobApiBase}/items?limit=${limit}&offset=${offset}`,
    [jobApiBase, limit, offset]
  );

  async function fetchJob() {
    if (!bulkJobId) return;
    setLoadingJob(true);
    setError(null);
    try {
      const res = await fetch(jobApiBase, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `Failed to fetch job (${res.status})`);
      setJob(j?.data ?? j);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingJob(false);
    }
  }

  async function fetchStats() {
    if (!bulkJobId) return;
    setLoadingStats(true);
    try {
      const res = await fetch(statsApi, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `Failed to fetch stats (${res.status})`);
      setStats(j?.data ?? j);
    } catch (e: any) {
      // stats failure should not break the page
      setStats({ ok: false, error: String(e?.message || e) });
    } finally {
      setLoadingStats(false);
    }
  }

  async function fetchItems() {
    if (!bulkJobId) return;
    setLoadingItems(true);
    setError(null);

    // queued filter must work even without telemetry -> prefer non-telemetry list endpoint
    const preferNonTelemetry = showOnlyQueued;

    try {
      if (!preferNonTelemetry) {
        const res = await fetch(telemetryApi, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json().catch(() => null);
          setItems(j?.data ?? j ?? []);
          return;
        }
      }

      const fallback = await fetch(itemsApi, { cache: "no-store" });
      const j = await fallback.json().catch(() => null);
      if (!fallback.ok) throw new Error(j?.error ?? `Failed to fetch items (${fallback.status})`);
      setItems(j?.data ?? j ?? []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingItems(false);
    }
  }

  async function downloadErrors() {
    if (!bulkJobId) return;
    window.open(`${jobApiBase}/items/errors`, "_blank");
  }

  useEffect(() => {
    if (!bulkJobId) return;
    fetchJob();
    fetchStats();
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobId, offset, limit, showOnlyQueued]);

  useEffect(() => {
    if (!bulkJobId || !autoPoll) return;
    let mounted = true;
    const t = setInterval(async () => {
      if (!mounted) return;
      await fetchJob();
      await fetchStats();
      await fetchItems();
    }, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobId, autoPoll, offset, limit, pollIntervalMs, showOnlyQueued]);

  // prefer authoritative stats if available
  const total = Number(stats?.total_items ?? job?.total_items ?? items?.length ?? 0);
  const completed = Number(stats?.completed_items ?? job?.completed_items ?? 0);
  const failed = Number(stats?.failed_items ?? job?.failed_items ?? 0);
  const inProgress = Number(stats?.in_progress_items ?? 0);
  const queued = Number(stats?.queued_items ?? Math.max(0, total - completed - failed - inProgress));
  const pct = total ? Math.round(((completed ?? 0) / total) * 100) : 0;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((it) => {
      const status = String(it.status ?? "").toLowerCase();

      if (showOnlyQueued) {
        if (!(status === "queued" || status === "pending")) return false;
      } else if (statusFilter !== "all") {
        if (status !== statusFilter) return false;
      }

      if (!q) return true;
      const hay = `${it.input_url} ${it.ingestion_id || ""} ${it.pipeline_run_id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, statusFilter, search, showOnlyQueued]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) || null;
  }, [items, selectedId]);

  async function retryItem(itemId: string) {
    if (!bulkJobId || !itemId) return;
    setRetryingIds((s) => ({ ...s, [itemId]: true }));
    setActionMessage(null);
    try {
      const url = `${jobApiBase}/items/${encodeURIComponent(itemId)}/retry`;
      const res = await fetch(url, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `Retry failed (${res.status})`);
      setActionMessage("Item re-enqueued");
      await fetchItems();
      await fetchJob();
      await fetchStats();
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
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `Retry failed (${res.status})`);
      setActionMessage("Failed items enqueued for retry");
      await fetchItems();
      await fetchJob();
      await fetchStats();
    } catch (e: any) {
      setActionMessage(String(e?.message || e));
    } finally {
      setTimeout(() => setActionMessage(null), 4000);
    }
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

  function openExtract(ingestionId?: string | null, sourceUrl?: string | null) {
    if (!ingestionId) return;
    const qp = new URLSearchParams();
    qp.set("ingestionId", ingestionId);
    if (sourceUrl) qp.set("sourceUrl", sourceUrl);
    window.open(`/dashboard/extract?${qp.toString()}`, "_blank");
  }

  function openPipelineOutput(pipelineRunId?: string | null, moduleIndex = 0) {
    if (!pipelineRunId) return;
    window.open(`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${moduleIndex}`, "_blank");
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
            return (
              <span
                key={m.module_index}
                className={classNames("h-2 w-4 rounded", cls)}
                title={`${m.module_index}:${m.module_name}:${m.status}`}
              />
            );
          })}
      </div>
    );
  }

  async function loadEnginePayloadFull(ingestionId: string, nonce: number) {
    if (!ingestionId) return;
    if (enginePayloadCache[ingestionId]) return;

    setEngineFullLoadingById((s) => ({ ...s, [ingestionId]: true }));
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}/engine-payload`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (nonce !== selectionNonceRef.current) return;
      if (!res.ok) throw new Error(j?.error ?? `engine payload fetch failed (${res.status})`);
      setEnginePayloadCache((s) => ({ ...s, [ingestionId]: j }));
    } catch (e: any) {
      if (nonce !== selectionNonceRef.current) return;
      setEnginePayloadCache((s) => ({ ...s, [ingestionId]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      if (nonce === selectionNonceRef.current) {
        setEngineFullLoadingById((s) => {
          const next = { ...s };
          delete next[ingestionId];
          return next;
        });
      }
    }
  }

  async function loadSeoPreview(ingestionId: string, nonce: number) {
    if (!ingestionId) return;
    if (seoCache[ingestionId]) return;

    setSeoLoadingById((s) => ({ ...s, [ingestionId]: true }));
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}/seo`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (nonce !== selectionNonceRef.current) return;
      if (!res.ok) throw new Error(j?.error ?? `seo preview fetch failed (${res.status})`);
      setSeoCache((s) => ({ ...s, [ingestionId]: j }));
    } catch (e: any) {
      if (nonce !== selectionNonceRef.current) return;
      setSeoCache((s) => ({ ...s, [ingestionId]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      if (nonce === selectionNonceRef.current) {
        setSeoLoadingById((s) => {
          const next = { ...s };
          delete next[ingestionId];
          return next;
        });
      }
    }
  }

  async function loadPipelineOutput(pipelineRunId: string, moduleIndex: number, nonce: number) {
    const k = `${pipelineRunId}:${moduleIndex}`;
    if (pipelineOutCache[k]) return;

    setPipelineOutLoading((s) => ({ ...s, [k]: true }));
    try {
      const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${moduleIndex}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (nonce !== selectionNonceRef.current) return;

      if (!res.ok) {
        setPipelineOutCache((s) => ({
          ...s,
          [k]: { ok: false, status: res.status, error: j?.error ?? `output fetch failed (${res.status})`, detail: j ?? null },
        }));
        return;
      }

      setPipelineOutCache((s) => ({ ...s, [k]: j }));
    } catch (e: any) {
      if (nonce !== selectionNonceRef.current) return;
      setPipelineOutCache((s) => ({ ...s, [k]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      if (nonce === selectionNonceRef.current) {
        setPipelineOutLoading((s) => {
          const next = { ...s };
          delete next[k];
          return next;
        });
      }
    }
  }

  function openDrawer(itemId: string, tab?: typeof drawerTab) {
    const item = items.find((i) => i.id === itemId) || null;

    selectionNonceRef.current += 1;
    const nonce = selectionNonceRef.current;

    setSelectedId(itemId);
    setDrawerOpen(true);

    const nextTab = tab ?? "seo";
    setDrawerTab(nextTab);

    const ingestionId = item?.ingestion_id || null;
    const pipelineRunId = item?.pipeline_run_id || null;

    if (ingestionId) {
      void loadSeoPreview(ingestionId, nonce);
      if (nextTab === "extract") void loadEnginePayloadFull(ingestionId, nonce);
    }
    if (pipelineRunId) {
      if (nextTab === "out0") void loadPipelineOutput(pipelineRunId, 0, nonce);
      if (nextTab === "out1") void loadPipelineOutput(pipelineRunId, 1, nonce);
    }
  }

  useEffect(() => {
    if (!drawerOpen) return;
    if (!selectedItem) return;

    const nonce = selectionNonceRef.current;
    const ingestionId = selectedItem.ingestion_id || null;
    const pipelineRunId = selectedItem.pipeline_run_id || null;

    if (drawerTab === "seo" && ingestionId) void loadSeoPreview(ingestionId, nonce);
    if (drawerTab === "extract" && ingestionId) void loadEnginePayloadFull(ingestionId, nonce);
    if (drawerTab === "out0" && pipelineRunId) void loadPipelineOutput(pipelineRunId, 0, nonce);
    if (drawerTab === "out1" && pipelineRunId) void loadPipelineOutput(pipelineRunId, 1, nonce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, drawerTab, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const stillExists = items.some((it) => it.id === selectedId);
    if (!stillExists) {
      setDrawerOpen(false);
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const seoPreview = selectedItem?.ingestion_id ? seoCache[selectedItem.ingestion_id] : null;
  const seoPreviewIsLoading = selectedItem?.ingestion_id ? Boolean(seoLoadingById[selectedItem.ingestion_id]) : false;

  const engineFull = selectedItem?.ingestion_id ? enginePayloadCache[selectedItem.ingestion_id] : null;
  const engineFullIsLoading = selectedItem?.ingestion_id ? Boolean(engineFullLoadingById[selectedItem.ingestion_id]) : false;

  const out0Key = selectedItem?.pipeline_run_id ? `${selectedItem.pipeline_run_id}:0` : null;
  const out1Key = selectedItem?.pipeline_run_id ? `${selectedItem.pipeline_run_id}:1` : null;

  const drawerOut0 = out0Key ? pipelineOutCache[out0Key] : null;
  const drawerOut1 = out1Key ? pipelineOutCache[out1Key] : null;

  const drawerOut0Loading = out0Key ? Boolean(pipelineOutLoading[out0Key]) : false;
  const drawerOut1Loading = out1Key ? Boolean(pipelineOutLoading[out1Key]) : false;

  const seoPayload = seoPreview?.seo_payload ?? null;
  const seoHtml = seoPreview?.description_html ?? null;
  const seoDiag = seoPreview?.diagnostics?.seo ?? null;

  const seoTitle = getSeoField(seoPayload, "title") || getSeoField(seoPayload, "seo.title");
  const seoMeta = getSeoField(seoPayload, "metaDescription") || getSeoField(seoPayload, "seo.metaDescription");
  const seoH1 = getSeoField(seoPayload, "h1") || getSeoField(seoPayload, "seo.h1");

  const seoPreviewDoc = useMemo(() => {
    return buildSeoPreviewHtmlDoc({
      title: seoTitle,
      metaDescription: seoMeta,
      h1: seoH1,
      descriptionHtml: seoHtml ? String(seoHtml) : null,
    });
  }, [seoTitle, seoMeta, seoH1, seoHtml]);

  const seoPreviewKey = useMemo(() => tinyHash(seoPreviewDoc || ""), [seoPreviewDoc]);

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
              fetchStats();
              fetchItems();
            }}
            className="rounded-md border px-3 py-2 text-sm bg-white"
            disabled={!bulkJobId || loadingJob || loadingItems || loadingStats}
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
            {stats?.ok === false ? <span className="ml-2 text-amber-700">(stats unavailable)</span> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Counts (job)</div>
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
          <div className="text-xs text-slate-500">Filters</div>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyQueued}
                onChange={(e) => {
                  setShowOnlyQueued(e.target.checked);
                  setOffset(0);
                }}
              />
              Show only queued
            </label>
            <div className="text-xs text-slate-500">
              Works without telemetry (uses non-telemetry list endpoint).
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Actions</div>
          <div className="mt-3 space-y-2">
            <button className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={retryFailedItems} disabled={failed === 0}>
              Retry failed items
            </button>
            <button className="w-full rounded-md border bg-white px-3 py-2 text-sm" onClick={() => { fetchJob(); fetchStats(); fetchItems(); }}>
              Refresh now
            </button>
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs text-slate-500">Items</div>
            <div className="text-sm text-slate-700">
              Showing <span className="font-semibold">{filteredItems.length}</span> / {items.length} (offset {offset}, limit {limit})
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input className="rounded-md border px-3 py-2 text-sm w-[260px]" placeholder="Search URL / IDs" value={search} onChange={(e) => setSearch(e.target.value)} />

            <select className="rounded-md border bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} disabled={showOnlyQueued}>
              <option value="all">All statuses</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In progress</option>
              <option value="queued">Queued</option>
              <option value="succeeded">Succeeded</option>
            </select>

            <select className="rounded-md border bg-white px-3 py-2 text-sm" value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setOffset(0); }}>
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

                  const mods = it.telemetry?.modules ?? [];
                  const modSummary = it.telemetry?.module_summary ?? null;

                  return (
                    <React.Fragment key={it.id}>
                      <tr className={classNames("border-t hover:bg-slate-50 cursor-pointer")} onClick={() => openDrawer(it.id)}>
                        <td className="py-2 pr-3 align-top">{it.item_index + 1}</td>

                        <td className="py-2 pr-3 align-top max-w-[52ch]">
                          <div className="truncate">{it.input_url}</div>
                          <div className="mt-1 text-xs text-slate-400 font-mono">id: {it.id.slice(0, 8)}…</div>
                        </td>

                        <td className="py-2 pr-3 align-top">
                          <div className="flex items-center gap-2">
                            {statusBadge(it.status)}
                            <span className="text-xs text-slate-500 font-mono">tries:{it.tries ?? "—"}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            ingestion: <span className="font-mono">{it.ingestion_id ? `${it.ingestion_id.slice(0, 10)}…` : "—"}</span>
                          </div>
                        </td>

                        <td className="py-2 pr-3 align-top">
                          {it.pipeline_run_id ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {statusBadge(it.telemetry?.pipeline_run?.status ?? "—")}
                                <span className="text-xs font-mono">{it.pipeline_run_id.slice(0, 10)}…</span>
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
                            <div className="max-w-[52ch] truncate text-xs text-rose-700">
                              {extractErrorMessage(it.last_error) || safeStringify(it.last_error, 220)}
                            </div>
                          ) : modSummary?.failed?.error ? (
                            <div className="max-w-[52ch] truncate text-xs text-rose-700">
                              {safeStringify(modSummary.failed.error, 220)}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-2 pr-3 align-top" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "seo")} disabled={!it.ingestion_id}>
                              SEO preview
                            </button>
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "extract")} disabled={!it.ingestion_id}>
                              Extract Full
                            </button>
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "out0")} disabled={!it.pipeline_run_id}>
                              Output 0
                            </button>
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "out1")} disabled={!it.pipeline_run_id}>
                              Output 1
                            </button>
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => setExpanded((s) => ({ ...s, [it.id]: !s[it.id] }))}>
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs bg-amber-400 text-slate-900 disabled:opacity-50"
                              disabled={retryingIds[it.id] || String(it.status).toLowerCase() !== "failed"}
                              onClick={() => retryItem(it.id)}
                            >
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
            Updated: {fmtDate(job?.updated_at)} {loadingJob || loadingItems || loadingStats ? "(refreshing…)" : ""}
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && selectedItem ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[860px] bg-white shadow-xl border-l flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Bulk item</div>
                <div className="font-semibold truncate">{selectedItem.input_url}</div>
                <div className="mt-1 text-xs text-slate-500 font-mono">
                  ingestion: {selectedItem.ingestion_id ?? "—"} • pipeline: {selectedItem.pipeline_run_id ?? "—"}
                </div>
              </div>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setDrawerOpen(false)}>
                Close
              </button>
            </div>

            <div className="px-4 pt-3 flex flex-wrap gap-2">
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "seo" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("seo")} disabled={!selectedItem.ingestion_id}>
                SEO preview
              </button>
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "summary" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("summary")}>
                Summary
              </button>
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "extract" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("extract")} disabled={!selectedItem.ingestion_id}>
                Extract Full
              </button>
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "out0" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("out0")} disabled={!selectedItem.pipeline_run_id}>
                Output 0
              </button>
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "out1" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("out1")} disabled={!selectedItem.pipeline_run_id}>
                Output 1
              </button>
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "telemetry" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("telemetry")}>
                Telemetry
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              {/* SEO */}
              {drawerTab === "seo" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">SEO preview (live HTML)</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={() => void copyToClipboard(seoPreviewDoc || "")}
                        disabled={!seoPreviewDoc}
                      >
                        Copy HTML
                      </button>
                      <button
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={() => downloadTextFile(`seo-preview-${selectedItem.ingestion_id || "seo"}.html`, seoPreviewDoc || "", "text/html")}
                        disabled={!seoPreviewDoc}
                      >
                        Download HTML
                      </button>
                    </div>
                  </div>

                  {seoPreviewIsLoading ? (
                    <div className="text-sm text-slate-600">Loading SEO…</div>
                  ) : seoPreview?.ok === false ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                      {seoPreview?.error ?? "No data available for this item"}
                    </div>
                  ) : seoPreview?.ok ? (
                    <>
                      <div className="rounded-xl border p-3 space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <div className="text-xs text-slate-500">Title</div>
                            <div className="text-sm">{seoTitle ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Meta description</div>
                            <div className="text-sm">{seoMeta ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">H1</div>
                            <div className="text-sm">{seoH1 ?? "—"}</div>
                          </div>
                        </div>

                        <div className="pt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded border p-2">
                            <div className="text-slate-500">audit score</div>
                            <div className="font-semibold">
                              {typeof seoDiag?.audit_score === "number" ? seoDiag.audit_score : "—"}
                            </div>
                          </div>
                          <div className="rounded border p-2">
                            <div className="text-slate-500">model</div>
                            <div className="font-mono">{seoDiag?.model ?? "—"}</div>
                          </div>
                          <div className="rounded border p-2">
                            <div className="text-slate-500">generated</div>
                            <div className="font-mono">{seoPreview?.seo_generated_at ? fmtDate(seoPreview.seo_generated_at) : "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-sm font-medium">Live preview</div>
                        <div className="mt-2 rounded border bg-white overflow-hidden">
                          <iframe key={seoPreviewKey} title="seo-preview" className="w-full h-[560px]" sandbox="" srcDoc={seoPreviewDoc} />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Preview is sandboxed (no scripts). Layout-only view.</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">No data available for this item</div>
                  )}
                </div>
              ) : null}

              {/* Summary */}
              {drawerTab === "summary" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      {statusBadge(selectedItem.status)}
                      <span className="text-xs text-slate-500 font-mono">tries:{selectedItem.tries ?? "—"}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 break-all">
                      ingestion_id: {selectedItem.ingestion_id ?? "—"}<br />
                      pipeline_run_id: {selectedItem.pipeline_run_id ?? "—"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="rounded-lg border p-3 text-left hover:bg-slate-50 disabled:opacity-50"
                      onClick={() => openExtract(selectedItem.ingestion_id, selectedItem.input_url)}
                      disabled={!selectedItem.ingestion_id}
                    >
                      <div className="text-xs text-slate-500">Open Extract</div>
                      <div className="text-sm font-medium">/dashboard/extract</div>
                    </button>

                    <button
                      className="rounded-lg border p-3 text-left hover:bg-slate-50 disabled:opacity-50"
                      onClick={() => openPipelineOutput(selectedItem.pipeline_run_id, 1)}
                      disabled={!selectedItem.pipeline_run_id}
                    >
                      <div className="text-xs text-slate-500">Open Output 1</div>
                      <div className="text-sm font-medium">/output/1</div>
                    </button>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-slate-500">Error</div>
                    <div className="mt-1 text-sm text-rose-700 whitespace-pre-wrap break-words">
                      {selectedItem.last_error ? (extractErrorMessage(selectedItem.last_error) || safeStringify(selectedItem.last_error, 4000)) : "—"}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Extract Full */}
              {drawerTab === "extract" ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Extract Full (engine payload)</div>
                  {engineFullIsLoading ? (
                    <div className="text-sm text-slate-600">Loading engine payload…</div>
                  ) : engineFull?.ok === false ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                      {engineFull?.error ?? "No data available for this item"}
                    </div>
                  ) : engineFull ? (
                    <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                      {safeStringify(engineFull.payload ?? null, 250000)}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-600">No data available for this item</div>
                  )}
                </div>
              ) : null}

              {/* Output 0 */}
              {drawerTab === "out0" ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Output 0</div>
                  {drawerOut0Loading ? (
                    <div className="text-sm text-slate-600">Loading output/0…</div>
                  ) : drawerOut0?.ok === false ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      No data available for this item (status {drawerOut0?.status ?? "—"}).<br />
                      <span className="text-xs">{String(drawerOut0?.error ?? "")}</span>
                    </div>
                  ) : drawerOut0 ? (
                    <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                      {safeStringify(drawerOut0, 250000)}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-600">No data available for this item</div>
                  )}
                </div>
              ) : null}

              {/* Output 1 */}
              {drawerTab === "out1" ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Output 1</div>
                  {drawerOut1Loading ? (
                    <div className="text-sm text-slate-600">Loading output/1…</div>
                  ) : drawerOut1?.ok === false ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      No data available for this item (status {drawerOut1?.status ?? "—"}).<br />
                      <span className="text-xs">{String(drawerOut1?.error ?? "")}</span>
                    </div>
                  ) : drawerOut1 ? (
                    <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                      {safeStringify(drawerOut1, 250000)}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-600">No data available for this item</div>
                  )}
                </div>
              ) : null}

              {/* Telemetry */}
              {drawerTab === "telemetry" ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Telemetry</div>
                  <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                    {selectedItem.telemetry ? safeStringify(selectedItem.telemetry, 250000) : "No telemetry available for this item"}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
