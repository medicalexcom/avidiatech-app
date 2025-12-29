"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /dashboard/seo
 *
 * Premium hybrid page (Extract + Describe + Monitor patterns)
 *
 * Key behaviors:
 * - Lets operators run SEO in two ways:
 *   1) From a URL (create a new ingestion)
 *   2) From an existing ingestionId (re-run / replay)
 * - Two run modes:
 *   - "SEO only": extract → seo
 *   - "Full pipeline": extract → seo → audit → import → monitor → price
 *
 * New:
 * - Bulk paste UI: paste many URLs (optional price column) and create a bulk job by calling POST /api/v1/bulk
 * - Shows created bulkJobId and link to Bulk dashboard (preview)
 *
 * Operator guardrails:
 * - Never report “completed” if pipeline status is “failed”.
 * - Ingestion polling treats terminal errors as terminal (server returns 409).
 * - When running a pipeline against an existing ingestion id (no new ingestion created),
 *   we persist a small diagnostics “rerun” flag (best-effort) so operators can see it was a re-run.
 */

type AnyObj = Record<string, any>;

type PipelineRunStatus = "queued" | "running" | "succeeded" | "failed";
type ModuleRunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

type PipelineModule = {
  id?: string;
  module_index: number;
  module_name: string;
  status: ModuleRunStatus;
  started_at?: string | null;
  finished_at?: string | null;
  output_ref?: string | null;
  error?: any;
};

type PipelineSnapshot = {
  run?: ({ id: string; status: PipelineRunStatus } & Record<string, any>) | null;
  modules?: PipelineModule[] | null;
};

type RunMode = "seo" | "full";
type SourceMode = "url" | "ingestion";

const SEO_ONLY_STEPS = ["extract", "seo"] as const;
const FULL_STEPS = ["extract", "seo", "audit", "import", "monitor", "price"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeDateMs(v?: string | null) {
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function extractEngineErrorMessage(payload: any): string {
  const e = payload?.error;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    return String(e.message || e.detail || e.code || "ingest_engine_error");
  }
  return String(payload?.last_error || "ingest_engine_error");
}

function shortId(id?: string | null, keep = 6) {
  if (!id) return "—";
  const s = String(id);
  if (s.length <= keep * 2 + 2) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

function statusPillTone(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "succeeded" || s === "success") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s === "failed" || s === "error") return "bg-rose-50 text-rose-800 border-rose-200";
  if (s === "running") return "bg-sky-50 text-sky-800 border-sky-200";
  if (s === "queued" || s === "pending") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

/* ---- Bulk parse helper (inline) ----
   Accept lines like:
     https://example.com/product
     https://example.com/prod, 19.99
   Returns [{ input_url, metadata }]
*/
function parseBulkText(text: string) {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items: Array<{ input_url: string; metadata: Record<string, any> }> = [];
  for (const raw of lines) {
    // split by comma or tab
    const parts = raw.split(/[,|\t]/).map((p) => p.trim());
    const url = parts[0];
    if (!url) continue;
    const meta: Record<string, any> = {};
    if (parts[1]) {
      const p = parts[1].replace(/\$/g, "");
      const f = parseFloat(p);
      if (!Number.isNaN(f)) meta.price = f;
      else meta.note = parts[1];
    }
    items.push({ input_url: url, metadata: meta });
  }
  return items;
}

/* ----------------- Component ----------------- */
export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const urlParam = params?.get("url") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";

  const [sourceMode, setSourceMode] = useState<SourceMode>(urlParam ? "url" : ingestionIdParam ? "ingestion" : "url");
  const [runMode, setRunMode] = useState<RunMode>(urlParam ? "full" : "seo");

  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [ingestionIdInput, setIngestionIdInput] = useState<string>(ingestionIdParam || "");

  // If a URL equals the current page urlParam and we already have an ingestionId, we can re-run without creating a new ingestion.
  const [reuseExistingWhenSameUrl, setReuseExistingWhenSameUrl] = useState<boolean>(true);

  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  // Debug / polling state
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  // Pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam || null);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);

  // ---- Bulk UI state ----
  const [bulkText, setBulkText] = useState<string>("");
  const [bulkPreview, setBulkPreview] = useState<Array<{ input_url: string; metadata: Record<string, any> }>>([]);
  const [bulkName, setBulkName] = useState<string>("");
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    if (pipelineRunIdParam) setPipelineRunId(pipelineRunIdParam);
  }, [pipelineRunIdParam]);

  useEffect(() => {
    // Keep UI sensible when page loads with params.
    if (urlParam) {
      setSourceMode("url");
      setRunMode("full");
      setUrlInput(urlParam);
    } else if (ingestionIdParam) {
      setSourceMode("ingestion");
      setIngestionIdInput(ingestionIdParam);
    }
  }, [urlParam, ingestionIdParam]);

  useEffect(() => {
    // Auto-fetch ingestion data when ingestionId changes.
    const id = ingestionIdInput.trim();
    if (!id) return;
    fetchIngestionData(id).catch((e) => {
      console.warn("fetchIngestionData failed", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionIdInput]);

  async function fetchIngestionData(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `Fetch failed: ${res.status}`);
      const row = json?.data ?? json;
      setJob(row);
      return row;
    } finally {
      setLoading(false);
    }
  }

  async function fetchPipelineSnapshot(runId: string) {
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`);
    return json as PipelineSnapshot;
  }

  async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);
      const s = snap?.run?.status;
      if (s === "succeeded" || s === "failed") return snap;
      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }

  /**
   * Polls /api/v1/ingest/job/:jobId until:
   * - 200 => returns payload
   * - 409 => throws terminal error (stop polling)
   * - 202 => continues polling
   */
  async function pollForIngestion(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");

    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
      const payload = await res.json().catch(() => null);

      if (res.status === 200) {
        setPollingState(`completed: ingestionId=${payload?.ingestionId}`);
        setStatusMessage("Ingestion callback received");
        return payload;
      }

      if (res.status === 409) {
        const msg = extractEngineErrorMessage(payload);
        setPollingState(`failed: ${msg}`);
        setStatusMessage(null);
        const err: any = new Error(msg);
        err.code = payload?.error?.code || "ingest_engine_error";
        err.payload = payload;
        throw err;
      }

      const elapsed = Math.floor((Date.now() - start) / 1000);
      setPollingState(`waiting... ${elapsed}s`);
      await sleep(intervalMs);
    }

    setPollingState("timeout");
    setStatusMessage(null);
    throw new Error("Ingestion did not complete within timeout");
  }

  async function createIngestion(url: string) {
    if (!url) throw new Error("Please enter a URL");

    setError(null);
    setRawIngestResponse(null);
    setPollingState(null);
    setStatusMessage("Submitting ingestion");

    const res = await fetch("/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        persist: true,
        options: { includeSeo: true },
      }),
    });

    const json = await res.json().catch(() => null);
    console.debug("POST /api/v1/ingest response:", res.status, json);
    setRawIngestResponse({ status: res.status, body: json });

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Ingest failed: ${res.status}`);
    }

    const possibleIngestionId =
      json?.ingestionId ?? json?.id ?? json?.data?.id ?? json?.data?.ingestionId ?? null;

    if (possibleIngestionId) {
      if (json?.status === "accepted" || res.status === 202) {
        const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId) throw new Error("Ingest did not return an ingestionId or jobId. See debug.");
    const pollResult = await pollForIngestion(jobId, 120_000, 3000);
    const newId = pollResult?.ingestionId ?? pollResult?.id ?? null;
    if (!newId) throw new Error("Polling returned no ingestionId.");
    return newId;
  }

  async function startPipelineRun(forIngestionId: string, mode: RunMode) {
    const steps = mode === "seo" ? SEO_ONLY_STEPS : FULL_STEPS;

    setStatusMessage("Starting pipeline");
    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ingestionId: forIngestionId,
        triggerModule: "seo",
        steps,
        options: {},
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || json?.error || `Pipeline start failed: ${res.status}`);

    const runId = String(json?.pipelineRunId ?? "");
    if (!runId) throw new Error("Pipeline start did not return pipelineRunId");

    setPipelineRunId(runId);

    // Keep page URL stable + shareable for operators
    const qp = new URLSearchParams();
    qp.set("ingestionId", forIngestionId);
    if (urlInput.trim()) qp.set("url", urlInput.trim());
    qp.set("pipelineRunId", runId);
    router.push(`/dashboard/seo?${qp.toString()}`);

    setStatusMessage("Pipeline running");
    return runId;
  }

  /**
   * markIngestionRerun
   *
   * Best-effort: attempt to persist a small diagnostics flag on the ingestion indicating this UI triggered a rerun.
   * Tries POST /api/v1/ingest/{id}/diagnostics with minimal payload; if it fails we log a warning and continue.
   * After success (or even failure), we refresh the ingestion row to show operators the current diagnostics.
   */
  async function markIngestionRerun(ingestionIdToMark: string, modeToMark: RunMode) {
    try {
      const payload = {
        rerun_by_ui: true,
        rerun_at: new Date().toISOString(),
        rerun_mode: modeToMark,
        note: "ui_rerun_flag",
      };

      // Primary attempt: POST to diagnostics endpoint (preferred)
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionIdToMark)}/diagnostics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchIngestionData(ingestionIdToMark);
        return true;
      }

      // Fallback: try PATCH-ing the ingestion record (best-effort)
      const fallback = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionIdToMark)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diagnostics: { ...(job as any)?.diagnostics, ui_rerun: payload } }),
      });

      if (fallback.ok) {
        await fetchIngestionData(ingestionIdToMark);
        return true;
      }

      console.warn("markIngestionRerun: all attempts failed", {
        resStatus: res.status,
        fallbackStatus: fallback.status,
      });
      return false;
    } catch (err) {
      console.warn("markIngestionRerun failed", err);
      return false;
    }
  }

  async function runNow() {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);

    try {
      const trimmedUrl = (urlInput || "").trim();
      const trimmedIngestion = (ingestionIdInput || "").trim();

      let idToUse: string | null = null;
      let createdNewIngestion = false;

      if (sourceMode === "ingestion") {
        if (!trimmedIngestion) throw new Error("Please enter an ingestionId");
        idToUse = trimmedIngestion;
      } else {
        if (!trimmedUrl) throw new Error("Please enter a URL");
        // If operator keeps the same url as the one in query params AND we already have an ingestion id,
        // allow replay without creating a new ingestion (optional toggle).
        const isSameAsInitial = Boolean(urlParam && trimmedUrl && urlParam === trimmedUrl);
        if (reuseExistingWhenSameUrl && isSameAsInitial && ingestionIdParam) {
          idToUse = ingestionIdParam;
          setIngestionIdInput(ingestionIdParam);
        } else {
          setJob(null);
          setRawIngestResponse(null);
          setPollingState(null);
          idToUse = await createIngestion(trimmedUrl);
          createdNewIngestion = true;
          setIngestionIdInput(idToUse);
        }
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      // If we didn't create a new ingestion, mark as rerun (best-effort)
      if (!createdNewIngestion) {
        await markIngestionRerun(idToUse, runMode);
      }

      // fetch current ingestion row before starting pipeline (improves telemetry)
      await fetchIngestionData(idToUse);

      const runId = await startPipelineRun(idToUse, runMode);

      const snap = await pollPipeline(runId, runMode === "seo" ? 180_000 : 300_000, 2000);

      // Always refresh ingestion after pipeline stops (success or failure)
      await fetchIngestionData(idToUse);

      const finalStatus = snap?.run?.status;

      if (finalStatus === "succeeded") {
        setStatusMessage(runMode === "seo" ? "SEO run succeeded" : "Full pipeline succeeded");
      } else if (finalStatus === "failed") {
        setStatusMessage(null);
        throw new Error("Pipeline failed (see pipeline telemetry + module output).");
      } else {
        setStatusMessage(null);
        throw new Error(`Pipeline ended in unexpected status: ${String(finalStatus)}`);
      }
    } catch (e: any) {
      if (e?.payload) console.warn("Terminal ingest error payload:", e.payload);
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setGenerating(false);
      setPollingState(null);
    }
  }

  const jobData = useMemo(() => {
    if (!job) return null;
    if ((job as any)?.data?.data) return (job as any).data.data;
    if ((job as any)?.data) return (job as any).data;
    return job;
  }, [job]);

  const seo = useMemo(() => {
    return (jobData as any)?.seo ?? (jobData as any)?.seoPayload ?? (jobData as any)?.seo_payload ?? null;
  }, [jobData]);

  const rawDescriptionHtml =
    (jobData as any)?.descriptionHtml ?? (jobData as any)?.description_html ?? (jobData as any)?._debug?.description_html ?? null;

  const descriptionHtml =
    typeof rawDescriptionHtml === "string" && rawDescriptionHtml.trim().length > 0 ? rawDescriptionHtml : null;

  const features = useMemo(() => {
    if (Array.isArray((jobData as any)?.features)) return (jobData as any).features;
    if (Array.isArray((jobData as any)?.seo_payload?.features)) return (jobData as any).seo_payload.features;
    return null;
  }, [jobData]);

  const highlightedDescription = useMemo(() => {
    if (!descriptionHtml) return "<em>No description generated yet</em>";
    if (!searchTerm) return descriptionHtml;
    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return descriptionHtml.replace(
        regex,
        '<mark class="bg-amber-200 text-gray-900 px-1 rounded-sm">$1</mark>'
      );
    } catch (err) {
      console.warn("Unable to highlight search term", err);
      return descriptionHtml;
    }
  }, [descriptionHtml, searchTerm]);

  const knownSeoKeys = [
    "h1",
    "pageTitle",
    "title",
    "metaDescription",
    "meta_description",
    "seoShortDescription",
    "seo_short_description",
    "shortDescription",
    "short_description",
    "keywords",
    "slug",
    "name_best",
  ];

  const parkedExtras = useMemo(() => {
    if (!seo || typeof seo !== "object") return [] as [string, any][];
    return Object.entries(seo).filter(([key]) => !knownSeoKeys.includes(key));
  }, [seo]);

  const handleCopyDescription = async () => {
    if (!descriptionHtml) return;
    try {
      await navigator.clipboard.writeText(descriptionHtml);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch (err) {
      console.warn("clipboard copy failed", err);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  const moduleDurations = useMemo(() => {
    const mods = (pipelineSnapshot?.modules ?? []) as PipelineModule[];
    return mods.map((m) => {
      const start = safeDateMs(m.started_at ?? null);
      const end = safeDateMs(m.finished_at ?? null);
      const duration = start != null && end != null ? clamp(end - start, 0, 24 * 60 * 60 * 1000) : null;
      return { ...m, duration_ms: duration };
    });
  }, [pipelineSnapshot]);

  // Rerun indicator from persisted diagnostics (if present)
  const rerunInfo = useMemo(() => {
    const d = (jobData as any)?.diagnostics;
    if (!d) return null;
    if (d?.ui_rerun) return d.ui_rerun;
    if (d?.rerun_by_ui) {
      return { rerun_by_ui: true, rerun_at: d?.rerun_at, rerun_mode: d?.rerun_mode };
    }
    if (d?.ui_rerun?.rerun_by_ui) return d.ui_rerun;
    return null;
  }, [jobData]);

  const pipelineStatus = pipelineSnapshot?.run?.status || (pipelineRunId ? "running" : null);

  const canRun =
    !generating &&
    ((sourceMode === "url" && urlInput.trim().length > 0) || (sourceMode === "ingestion" && ingestionIdInput.trim().length > 0));

  /* ---------------- Bulk helpers ---------------- */
  function previewBulk() {
    try {
      const items = parseBulkText(bulkText);
      setBulkPreview(items);
      setBulkError(null);
    } catch (e: any) {
      setBulkError(String(e?.message || e));
      setBulkPreview([]);
    }
  }

  async function createBulk() {
    if (bulkCreating) return;
    setBulkCreating(true);
    setBulkError(null);
    setBulkJobId(null);

    try {
      // basic validation
      if (!bulkText.trim()) throw new Error("Paste at least one URL");
      const name = bulkName.trim() || `bulk-${new Date().toISOString()}`;
      const res = await fetch("/api/v1/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, pasted: bulkText }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.bulkJobId) {
        throw new Error(j?.error || j?.message || `Bulk create failed: ${res?.status}`);
      }
      setBulkJobId(j.bulkJobId);
      // Navigate to bulk dashboard (existing page) with the id as param for operator convenience
      router.push(`/dashboard/bulk?bulkJobId=${encodeURIComponent(j.bulkJobId)}`);
    } catch (err: any) {
      setBulkError(String(err?.message || err));
    } finally {
      setBulkCreating(false);
    }
  }

  /* ---------------- Layout (kept clean, no truncated classes) ---------------- */
  return (
    <main className="relative min-h-[calc(100vh-64px)]">
      {/* Background treatment (artsy, module-gradients) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 10%, rgba(14,165,233,0.22), transparent 45%), radial-gradient(circle at 80% 18%, rgba(16,185,129,0.18), transparent 48%)" }} />
        <div className="absolute inset-0 opacity-30" style={{ backgroundSize: "24px 24px", backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)" }} />
        <div className="absolute -top-24 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-900/20" />
        <div className="absolute top-56 -left-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/15" />
        <div className="absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-900/15" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Hero + Launcher */}
        <section className="relative overflow-hidden rounded-3xl">
          <div className="rounded-3xl bg-gradient-to-r from-sky-500/40 via-emerald-500/30 to-amber-500/35 p-[1px]">
            <div className="rounded-3xl border border-white/30 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500" />
                  AvidiaSEO <span className="text-slate-400">•</span> <span className="text-slate-500">Extract → SEO → HTML</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", statusPillTone(pipelineStatus))}>
                    <span className="font-medium">Pipeline</span>
                    <span className="text-slate-400">•</span>
                    <span>{pipelineStatus || "—"}</span>
                  </div>

                  {ingestionIdInput.trim() ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm">
                      <span className="font-medium">Ingestion</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono">{shortId(ingestionIdInput.trim())}</span>
                    </div>
                  ) : null}

                  {pipelineRunId ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm">
                      <span className="font-medium">Run</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono">{shortId(pipelineRunId)}</span>
                    </div>
                  ) : null}

                  {rerunInfo ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-900 shadow-sm">
                      <span className="font-medium">Re-run</span>
                      <span className="text-amber-500">•</span>
                      <span>{rerunInfo?.rerun_mode || "—"}</span>
                      {rerunInfo?.rerun_at ? <span className="text-amber-700">{new Date(rerunInfo.rerun_at).toLocaleString()}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 max-w-3xl">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
                  SEO-ready fields + description HTML, with full run telemetry
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Run SEO from a URL or replay a stored ingestion. You always keep the diagnostic trail: module statuses,
                  per-module outputs, and the raw ingestion JSON.
                </p>
              </div>

              {/* Launcher */}
              <div className="mt-5 rounded-2xl bg-gradient-to-r from-sky-500/25 via-emerald-500/20 to-amber-500/20 p-[1px]">
                <div className="rounded-2xl border border-white/30 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/35">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Run SEO</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose input + run mode. No hidden assumptions.</div>

                      <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                        <button
                          className={cx(
                            "rounded-lg px-3 py-2 text-left",
                            sourceMode === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                          )}
                          onClick={() => setSourceMode("url")}
                          disabled={generating}
                        >
                          From URL
                        </button>
                        <button
                          className={cx(
                            "rounded-lg px-3 py-2 text-left",
                            sourceMode === "ingestion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                          )}
                          onClick={() => setSourceMode("ingestion")}
                          disabled={generating}
                        >
                          From ingestionId
                        </button>
                      </div>

                      {sourceMode === "url" ? (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Source URL</label>
                          <input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
                            placeholder="https://example.com/product/..."
                            disabled={generating}
                          />

                          {ingestionIdParam && urlParam ? (
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={reuseExistingWhenSameUrl}
                                onChange={(e) => setReuseExistingWhenSameUrl(e.target.checked)}
                                disabled={generating}
                              />
                              Re-use existing ingestionId when URL matches this page
                            </label>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Ingestion ID</label>
                          <input
                            value={ingestionIdInput}
                            onChange={(e) => setIngestionIdInput(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
                            placeholder="ing_..."
                            disabled={generating}
                          />
                          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            Replays a stored ingestion and marks diagnostics as a re-run (best-effort).
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full lg:w-[360px]">
                      <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-medium text-slate-600">Run mode</div>
                            <div className="mt-0.5 text-sm font-semibold text-slate-900">{runMode === "seo" ? "SEO only" : "Full pipeline"}</div>
                          </div>

                          {ingestionIdInput.trim() ? (
                            <a className="text-xs text-slate-600 underline" href={`/dashboard/monitor?ingestionId=${encodeURIComponent(ingestionIdInput.trim())}`}>
                              Open Monitor
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs">
                          <button
                            className={cx("rounded-lg px-3 py-2 text-left", runMode === "seo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
                            onClick={() => setRunMode("seo")}
                            disabled={generating}
                          >
                            SEO only
                            <div className="mt-0.5 text-[11px] text-slate-500">extract → seo</div>
                          </button>

                          <button
                            className={cx("rounded-lg px-3 py-2 text-left", runMode === "full" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
                            onClick={() => setRunMode("full")}
                            disabled={generating}
                          >
                            Full pipeline
                            <div className="mt-0.5 text-[11px] text-slate-500">extract → … → price</div>
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className={cx(
                              "inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm",
                              canRun ? "bg-gradient-to-r from-sky-600 via-emerald-600 to-amber-600" : "bg-slate-300"
                            )}
                            onClick={runNow}
                            disabled={!canRun}
                          >
                            {generating ? "Running…" : runMode === "seo" ? "Run SEO" : "Run Full Pipeline"}
                          </button>

                          {ingestionIdInput.trim() ? (
                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                              onClick={() => fetchIngestionData(ingestionIdInput.trim())}
                              disabled={generating}
                              title="Refresh ingestion row"
                            >
                              Refresh
                            </button>
                          ) : null}
                        </div>

                        {statusMessage ? (
                          <div className="mt-3 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700">
                            <span className="font-medium">Status</span>
                            <span className="text-slate-400"> • </span>
                            <span>{statusMessage}</span>
                          </div>
                        ) : null}

                        {pollingState ? (
                          <div className="mt-2 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs text-slate-700">
                            <span className="font-medium">Ingest</span>
                            <span className="text-slate-400"> • </span>
                            <span>{pollingState}</span>
                          </div>
                        ) : null}

                        {error ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                            {error}
                          </div>
                        ) : null}

                        {rawIngestResponse ? (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-slate-600">Ingest debug</summary>
                            <pre className="mt-2 max-h-[220px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                              {JSON.stringify(rawIngestResponse, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ingestionIdInput.trim() ? (
                  <a className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700" href={`/dashboard/extract?ingestionId=${encodeURIComponent(ingestionIdInput.trim())}`}>
                    Open Extract
                  </a>
                ) : null}

                {ingestionIdInput.trim() ? (
                  <a className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700" href={`/dashboard/describe?ingestionId=${encodeURIComponent(ingestionIdInput.trim())}`}>
                    Open Describe
                  </a>
                ) : null}

                {ingestionIdInput.trim() ? (
                  <a className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-700" href={`/dashboard/monitor?ingestionId=${encodeURIComponent(ingestionIdInput.trim())}`}>
                    Open Monitor
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: human canvas */}
          <div className="lg:col-span-8 space-y-4">
            {/* Description and Pipeline telemetry sections (kept as in original) */}
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Description HTML</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Live preview (search + copy). Uses canonical field: <span className="font-mono">descriptionHtml</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    placeholder="Search in HTML…"
                  />
                  <button
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                  >
                    {copyState === "copied" ? "Copied" : "Copy HTML"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Pipeline telemetry</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Module statuses, durations, and direct module output links (even on failure).</p>
                </div>

                {pipelineSnapshot?.run?.id || pipelineRunId ? (
                  <div className="text-right text-xs text-slate-600">
                    <div>Run: <span className="font-mono">{shortId(pipelineSnapshot?.run?.id || pipelineRunId)}</span></div>
                    <div>Status: <span className="font-semibold">{pipelineSnapshot?.run?.status || "—"}</span></div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No run yet.</div>
                )}
              </div>

              <div className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Module</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Output</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleDurations.map((m: any) => (
                      <tr key={`${m.module_name}-${m.module_index}`} className="border-t">
                        <td className="px-3 py-2"><span className="font-medium">{m.module_name}</span> <span className="text-xs text-slate-400">#{m.module_index}</span></td>
                        <td className="px-3 py-2">
                          <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusPillTone(m.status))}>{m.status}</span>
                        </td>
                        <td className="px-3 py-2">{m.duration_ms != null ? formatDuration(m.duration_ms) : "—"}</td>
                        <td className="px-3 py-2">
                          {pipelineRunId ? (
                            <a className="text-sm text-slate-700 underline" href={`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${encodeURIComponent(String(m.module_index))}`} target="_blank" rel="noreferrer">View output</a>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {m.status === "failed" ? <span className="line-clamp-2">{typeof m.error === "string" ? m.error : JSON.stringify(m.error || "")}</span> : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}

                    {!moduleDurations.length ? (
                      <tr>
                        <td className="px-3 py-3 text-sm text-slate-500" colSpan={5}>No module telemetry available yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {loading ? <div className="text-sm text-slate-600">Loading ingestion…</div> : null}
          </div>

          {/* Right rail */}
          <aside className="lg:col-span-4 space-y-4">
            {/* SEO card */}
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">SEO</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-800">
                <div>
                  <div className="text-xs font-medium text-slate-500">H1</div>
                  <div className="mt-0.5 break-words">{seo?.h1 ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Title</div>
                  <div className="mt-0.5 break-words">{seo?.pageTitle ?? seo?.title ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Meta description</div>
                  <div className="mt-0.5 break-words">{seo?.metaDescription ?? seo?.meta_description ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Short description</div>
                  <div className="mt-0.5 break-words">{seo?.shortDescription ?? seo?.seoShortDescription ?? seo?.seo_short_description ?? "—"}</div>
                </div>
              </div>

              {Array.isArray(features) && features.length > 0 ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">Features</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                    {features.map((f: any, i: number) => (
                      <li key={i} className="break-words">{String(f)}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4 text-xs text-slate-500">No features found.</div>
              )}

              {parkedExtras.length > 0 ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-600">Extra SEO keys</summary>
                  <pre className="mt-2 max-h-[260px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                    {JSON.stringify(Object.fromEntries(parkedExtras), null, 2)}
                  </pre>
                </details>
              ) : (
                <div className="mt-3 text-xs text-slate-500">No extra SEO keys.</div>
              )}
            </section>

            {/* Bulk paste card - NEW */}
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Bulk paste</h2>
                <div className="text-xs text-slate-500">Create a bulk job from pasted URLs</div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Paste one URL per line. Optional price may follow after a comma: <code>https://... , 19.99</code>
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="https://example.com/product-1, 19.99\nhttps://example.com/product-2"
                className="mt-3 w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="Job name (optional)"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    previewBulk();
                  }}
                >
                  Preview
                </button>
                <button
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  onClick={createBulk}
                  disabled={bulkCreating || !bulkText.trim()}
                >
                  {bulkCreating ? "Creating…" : "Create Bulk Job"}
                </button>
              </div>

              {bulkError ? <div className="mt-3 text-sm text-rose-600">{bulkError}</div> : null}

              {bulkPreview.length > 0 ? (
                <div className="mt-3 text-xs">
                  <div className="text-xs text-slate-600">Preview ({bulkPreview.length} items)</div>
                  <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-200 bg-white p-2 text-xs">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left">#</th>
                          <th className="text-left">URL</th>
                          <th className="text-left">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(0, 50).map((it, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1 pr-2">{i + 1}</td>
                            <td className="py-1 break-words">{it.input_url}</td>
                            <td className="py-1">{it.metadata?.price ?? "—"}</td>
                          </tr>
                        ))}
                        {bulkPreview.length > 50 && (
                          <tr>
                            <td colSpan={3} className="py-1 text-slate-500">…truncated</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {bulkJobId ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  Bulk job created:{" "}
                  <a className="font-mono underline" href={`/dashboard/bulk?bulkJobId=${encodeURIComponent(bulkJobId)}`}>
                    {bulkJobId}
                  </a>
                </div>
              ) : null}
            </section>

            {/* Raw ingestion JSON */}
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw ingestion JSON</summary>
                <div className="mt-2 text-xs text-slate-500">
                  The full persisted ingestion row used by downstream modules.
                </div>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                  {JSON.stringify(jobData ?? null, null, 2)}
                </pre>
              </details>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
