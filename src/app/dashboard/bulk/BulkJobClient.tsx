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

  return (
    <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", cls)}>
      {s}
    </span>
  );
}

function extractErrorMessage(last_error: any): string | null {
  if (!last_error) return null;
  if (typeof last_error === "string") return last_error;
  if (typeof last_error?.message === "string") return last_error.message;
  return null;
}

function jsonCounts(payload: any) {
  const specsCount =
    payload?.specs && typeof payload.specs === "object" ? Object.keys(payload.specs).length : null;
  const featuresCount = Array.isArray(payload?.features_raw) ? payload.features_raw.length : null;
  const imagesCount = Array.isArray(payload?.images) ? payload.images.length : null;
  const tabsCount = Array.isArray(payload?.tabs) ? payload.tabs.length : null;

  return { specsCount, featuresCount, imagesCount, tabsCount };
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

function tinyHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
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

  // SEO Preview should be the default open tab
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"summary" | "extract" | "seo" | "out0" | "out1" | "telemetry">("seo");

  // caches
  const [engineSummaryCache, setEngineSummaryCache] = useState<Record<string, any>>({});
  const [enginePayloadCache, setEnginePayloadCache] = useState<Record<string, any>>({});
  const [engineSummaryLoadingById, setEngineSummaryLoadingById] = useState<Record<string, boolean>>({});
  const [engineFullLoadingById, setEngineFullLoadingById] = useState<Record<string, boolean>>({});

  const [seoCache, setSeoCache] = useState<Record<string, any>>({});
  const [seoLoadingById, setSeoLoadingById] = useState<Record<string, boolean>>({});

  // IMPORTANT: cache keys should include moduleIndex to avoid showing wrong data between out0/out1
  const [pipelineOutCache, setPipelineOutCache] = useState<Record<string, any>>({});
  const [pipelineOutLoading, setPipelineOutLoading] = useState<Record<string, boolean>>({});
  const [pipelineOutError, setPipelineOutError] = useState<Record<string, string>>({});

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

  async function downloadErrors() {
    if (!bulkJobId) return;
    window.open(`${jobApiBase}/items/errors`, "_blank");
  }

  /**
   * SUMMARY TAB: your /dashboard/extract appears broken, so we avoid routing users there.
   * Instead, provide "Output 0" as the canonical Extract view (real pipeline artifact).
   */
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

  async function loadEngineSummary(ingestionId: string) {
    if (!ingestionId) return;
    if (engineSummaryCache[ingestionId]) return;

    setEngineSummaryLoadingById((s) => ({ ...s, [ingestionId]: true }));
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}/engine-payload?mode=summary`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `engine summary fetch failed (${res.status})`);
      setEngineSummaryCache((s) => ({ ...s, [ingestionId]: j }));
    } catch (e: any) {
      setEngineSummaryCache((s) => ({ ...s, [ingestionId]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      setEngineSummaryLoadingById((s) => {
        const next = { ...s };
        delete next[ingestionId];
        return next;
      });
    }
  }

  async function loadEnginePayloadFull(ingestionId: string) {
    if (!ingestionId) return;

    // ALWAYS refetch for "Extract full" (ensures it reflects the real latest data, not a stale cache)
    setEngineFullLoadingById((s) => ({ ...s, [ingestionId]: true }));
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}/engine-payload`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `engine payload fetch failed (${res.status})`);
      setEnginePayloadCache((s) => ({ ...s, [ingestionId]: j }));
    } catch (e: any) {
      setEnginePayloadCache((s) => ({ ...s, [ingestionId]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      setEngineFullLoadingById((s) => {
        const next = { ...s };
        delete next[ingestionId];
        return next;
      });
    }
  }

  async function loadSeoPreview(ingestionId: string) {
    if (!ingestionId) return;

    // Always refetch when opening SEO tab (avoid stale)
    setSeoLoadingById((s) => ({ ...s, [ingestionId]: true }));
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}/seo`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `seo preview fetch failed (${res.status})`);
      setSeoCache((s) => ({ ...s, [ingestionId]: j }));
    } catch (e: any) {
      setSeoCache((s) => ({ ...s, [ingestionId]: { ok: false, error: String(e?.message || e) } }));
    } finally {
      setSeoLoadingById((s) => {
        const next = { ...s };
        delete next[ingestionId];
        return next;
      });
    }
  }

  function outKey(pipelineRunId: string, moduleIndex: number) {
    return `${pipelineRunId}:${moduleIndex}`;
  }

  async function loadPipelineOutput(pipelineRunId: string, moduleIndex: number) {
    const k = outKey(pipelineRunId, moduleIndex);

    // ALWAYS refetch on tab open to ensure correctness
    setPipelineOutLoading((s) => ({ ...s, [k]: true }));
    setPipelineOutError((s) => {
      const next = { ...s };
      delete next[k];
      return next;
    });

    try {
      const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${moduleIndex}`, {
        cache: "no-store",
      });

      // Output endpoints may return JSON or raw; handle both
      const text = await res.text().catch(() => "");
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { _raw: text };
      }

      if (!res.ok) {
        const msg = parsed?.error ?? `output_${moduleIndex}_fetch_failed (${res.status})`;
        throw new Error(msg);
      }

      setPipelineOutCache((s) => ({ ...s, [k]: parsed }));
    } catch (e: any) {
      setPipelineOutError((s) => ({ ...s, [k]: String(e?.message || e) }));
      setPipelineOutCache((s) => {
        const next = { ...s };
        delete next[k];
        return next;
      });
    } finally {
      setPipelineOutLoading((s) => {
        const next = { ...s };
        delete next[k];
        return next;
      });
    }
  }

  // Clicking a row should default to SEO tab (and fetch everything needed)
  function onRowClick(itemId: string) {
    openDrawer(itemId, "seo");
  }

  function openDrawer(itemId: string, tab: typeof drawerTab = "seo") {
    const item = items.find((i) => i.id === itemId) || null;

    setSelectedId(itemId);
    setDrawerTab(tab);
    setDrawerOpen(true);

    const ingestionId = item?.ingestion_id || null;
    const pipelineRunId = item?.pipeline_run_id || null;

    if (ingestionId) {
      void loadEngineSummary(ingestionId);
      void loadSeoPreview(ingestionId);
      if (tab === "extract") void loadEnginePayloadFull(ingestionId);
    }

    if (pipelineRunId) {
      if (tab === "out0") void loadPipelineOutput(pipelineRunId, 0);
      if (tab === "out1") void loadPipelineOutput(pipelineRunId, 1);
    }
  }

  // When switching tabs, fetch live data for that tab
  useEffect(() => {
    if (!drawerOpen) return;
    if (!selectedItem) return;

    const ingestionId = selectedItem.ingestion_id || null;
    const pipelineRunId = selectedItem.pipeline_run_id || null;

    if (drawerTab === "seo" && ingestionId) void loadSeoPreview(ingestionId);
    if (drawerTab === "extract" && ingestionId) void loadEnginePayloadFull(ingestionId);
    if (drawerTab === "out0" && pipelineRunId) void loadPipelineOutput(pipelineRunId, 0);
    if (drawerTab === "out1" && pipelineRunId) void loadPipelineOutput(pipelineRunId, 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTab, drawerOpen, selectedId]);

  const engineSummary = selectedItem?.ingestion_id ? engineSummaryCache[selectedItem.ingestion_id] : null;
  const engineSummaryLoading = selectedItem?.ingestion_id ? Boolean(engineSummaryLoadingById[selectedItem.ingestion_id]) : false;

  const engineFull = selectedItem?.ingestion_id ? enginePayloadCache[selectedItem.ingestion_id] : null;
  const engineFullIsLoading = selectedItem?.ingestion_id ? Boolean(engineFullLoadingById[selectedItem.ingestion_id]) : false;

  const seoPreview = selectedItem?.ingestion_id ? seoCache[selectedItem.ingestion_id] : null;
  const seoPreviewIsLoading = selectedItem?.ingestion_id ? Boolean(seoLoadingById[selectedItem.ingestion_id]) : false;

  const pipelineRunId = selectedItem?.pipeline_run_id || null;
  const out0K = pipelineRunId ? outKey(pipelineRunId, 0) : null;
  const out1K = pipelineRunId ? outKey(pipelineRunId, 1) : null;

  const out0Data = out0K ? pipelineOutCache[out0K] : null;
  const out1Data = out1K ? pipelineOutCache[out1K] : null;

  const out0Loading = out0K ? Boolean(pipelineOutLoading[out0K]) : false;
  const out1Loading = out1K ? Boolean(pipelineOutLoading[out1K]) : false;

  const out0Err = out0K ? pipelineOutError[out0K] : null;
  const out1Err = out1K ? pipelineOutError[out1K] : null;

  const fullPayload = engineFull?.payload ?? null;
  const fullStats = fullPayload ? jsonCounts(fullPayload) : null;

  const seoPayload = seoPreview?.seo_payload ?? null;
  const seoHtml = seoPreview?.description_html ?? null;
  const seoDiag = seoPreview?.diagnostics?.seo ?? null;

  const seoTitle = getSeoField(seoPayload, "title") || getSeoField(seoPayload, "seo.title");
  const seoMeta = getSeoField(seoPayload, "metaDescription") || getSeoField(seoPayload, "seo.metaDescription");
  const seoH1 = getSeoField(seoPayload, "h1") || getSeoField(seoPayload, "seo.h1");
  const seoShort = getSeoField(seoPayload, "shortDescription") || getSeoField(seoPayload, "seo.shortDescription");

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
      {/* header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulk job dashboard</h1>
          <div className="mt-1 text-sm text-slate-600">
            Job id: <span className="font-mono">{bulkJobId || "—"}</span>
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

      {/* KPIs */}
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
          <div className="mt-2 text-xs text-slate-500">Job status: {statusBadge(job?.status ?? "—")}</div>
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
          <div className="mt-2 text-xs text-slate-500">Adds pipeline + module status per item.</div>
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

      {/* Table */}
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

                  const pipe = it.telemetry?.pipeline_run ?? null;
                  const modSummary = it.telemetry?.module_summary ?? null;
                  const mods = it.telemetry?.modules ?? [];

                  return (
                    <React.Fragment key={it.id}>
                      <tr className={classNames("border-t hover:bg-slate-50 cursor-pointer")} onClick={() => onRowClick(it.id)}>
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
                                {statusBadge(pipe?.status ?? "—")}
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
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "seo")} disabled={!it.ingestion_id}>
                              SEO preview
                            </button>
                            <button className="rounded px-2 py-1 text-xs border bg-white" onClick={() => openDrawer(it.id, "extract")} disabled={!it.ingestion_id}>
                              Extract full
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
                              disabled={retryingIds[it.id] || it.status !== "failed"}
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
            Updated: {fmtDate(job?.updated_at)} {loadingJob || loadingItems ? "(refreshing…)" : ""}
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
              <button className={classNames("rounded-full border px-3 py-1 text-xs", drawerTab === "extract" && "bg-sky-50 border-sky-200")} onClick={() => setDrawerTab("extract")} disabled={!selectedItem.ingestion_id}>
                Extract full
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
              {drawerTab === "extract" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Extract full (ingest-engine-payloads)</div>
                    {selectedItem.ingestion_id ? (
                      <button className="text-xs underline text-sky-700" onClick={() => void loadEnginePayloadFull(selectedItem.ingestion_id!)}>
                        refresh
                      </button>
                    ) : null}
                  </div>

                  {engineFullIsLoading ? (
                    <div className="text-sm text-slate-600">Loading engine payload…</div>
                  ) : engineFull?.ok === false ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                      {engineFull?.error ?? "Failed to load engine payload"}
                    </div>
                  ) : engineFull?.ok ? (
                    <>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-slate-500">Storage ref</div>
                        <div className="mt-1 font-mono text-xs break-all">
                          {engineFull.bucket}/{engineFull.ref}
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                          <div className="rounded border p-2">
                            <div className="text-slate-500">specs</div>
                            <div className="font-semibold">{fullStats?.specsCount ?? "—"}</div>
                          </div>
                          <div className="rounded border p-2">
                            <div className="text-slate-500">features</div>
                            <div className="font-semibold">{fullStats?.featuresCount ?? "—"}</div>
                          </div>
                          <div className="rounded border p-2">
                            <div className="text-slate-500">images</div>
                            <div className="font-semibold">{fullStats?.imagesCount ?? "—"}</div>
                          </div>
                          <div className="rounded border p-2">
                            <div className="text-slate-500">tabs</div>
                            <div className="font-semibold">{fullStats?.tabsCount ?? "—"}</div>
                          </div>
                        </div>
                      </div>

                      <details className="rounded-xl border p-3">
                        <summary className="cursor-pointer text-sm font-medium">View JSON</summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap break-all max-h-[520px] overflow-auto rounded border bg-slate-50 p-2">
                          {safeStringify(engineFull.payload, 250000)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">No payload available yet for this ingestion.</div>
                  )}
                </div>
              ) : null}

              {drawerTab === "out0" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Output 0 (module artifact)</div>
                    {selectedItem.pipeline_run_id ? (
                      <button className="text-xs underline text-sky-700" onClick={() => void loadPipelineOutput(selectedItem.pipeline_run_id!, 0)}>
                        refresh
                      </button>
                    ) : null}
                  </div>

                  {out0Loading ? (
                    <div className="text-sm text-slate-600">Loading output/0…</div>
                  ) : out0Err ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{out0Err}</div>
                  ) : out0Data ? (
                    <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                      {safeStringify(out0Data, 250000)}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-600">No output/0 available yet for this pipeline run.</div>
                  )}

                  {selectedItem.pipeline_run_id ? (
                    <button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => openPipelineOutput(selectedItem.pipeline_run_id, 0)}>
                      Open raw output/0 endpoint
                    </button>
                  ) : null}
                </div>
              ) : null}

              {drawerTab === "out1" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Output 1 (module artifact)</div>
                    {selectedItem.pipeline_run_id ? (
                      <button className="text-xs underline text-sky-700" onClick={() => void loadPipelineOutput(selectedItem.pipeline_run_id!, 1)}>
                        refresh
                      </button>
                    ) : null}
                  </div>

                  {out1Loading ? (
                    <div className="text-sm text-slate-600">Loading output/1…</div>
                  ) : out1Err ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{out1Err}</div>
                  ) : out1Data ? (
                    <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                      {safeStringify(out1Data, 250000)}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-600">No output/1 available yet for this pipeline run.</div>
                  )}

                  {selectedItem.pipeline_run_id ? (
                    <button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => openPipelineOutput(selectedItem.pipeline_run_id, 1)}>
                      Open raw output/1 endpoint
                    </button>
                  ) : null}
                </div>
              ) : null}

              {drawerTab === "seo" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">SEO preview (live HTML)</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={() => {
                          const html = seoPreviewDoc || "";
                          void copyToClipboard(html);
                        }}
                        disabled={!seoPreviewDoc}
                      >
                        Copy HTML
                      </button>
                      <button
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={() => {
                          const html = seoPreviewDoc || "";
                          const id = selectedItem.ingestion_id || "seo";
                          downloadTextFile(`seo-preview-${id}.html`, html, "text/html");
                        }}
                        disabled={!seoPreviewDoc}
                      >
                        Download HTML
                      </button>
                      {selectedItem.ingestion_id ? (
                        <button className="text-xs underline text-sky-700" onClick={() => void loadSeoPreview(selectedItem.ingestion_id!)}>
                          refresh
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {seoPreviewIsLoading ? (
                    <div className="text-sm text-slate-600">Loading SEO…</div>
                  ) : seoPreview?.ok === false ? (
                    <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
                      {seoPreview?.error ?? "Failed to load SEO preview"}
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
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-slate-500">H1</div>
                              <div className="text-sm">{seoH1 ?? "—"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Short description</div>
                              <div className="text-sm">{seoShort ?? "—"}</div>
                            </div>
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
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">No SEO data loaded yet.</div>
                  )}
                </div>
              ) : null}

              {drawerTab === "telemetry" ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Telemetry</div>
                  <pre className="text-xs whitespace-pre-wrap break-all max-h-[720px] overflow-auto rounded border bg-slate-50 p-3">
                    {selectedItem.telemetry ? safeStringify(selectedItem.telemetry, 250000) : "—"}
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
