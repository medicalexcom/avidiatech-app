"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client) — final layout
 *
 * Goals:
 * - URL input is first thing users see (above the fold).
 * - Two clear actions: Quick SEO (fast) and Full Pipeline (ops).
 * - Zero “dead air”: tighten spacing, reorder cards, keep status + outputs visible.
 * - Keep durable traceability: both modes create pipeline_runs + module_runs.
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
  run?: { id: string; status: PipelineRunStatus } & Record<string, any>;
  modules?: PipelineModule[];
};

type Mode = "quick" | "full";

const QUICK_STEPS = ["extract", "seo"] as const;
const FULL_STEPS = ["extract", "seo", "audit", "import", "monitor", "price"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeTrunc(s: string, n = 34) {
  if (!s) return "";
  if (s.length <= n) return s;
  return `${s.slice(0, Math.max(8, n - 9))}…${s.slice(-6)}`;
}

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "succeeded" || s === "success" || s === "done") return "done";
  if (s === "failed" || s === "error") return "failed";
  if (s === "running" || s === "queued" || s === "active") return "active";
  if (s === "skipped") return "skipped";
  return "idle";
}

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;
  const pipelineRunIdParam = params?.get("pipelineRunId") || null;

  const ingestionId = ingestionIdParam;

  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false); // ingestion fetch
  const [generating, setGenerating] = useState(false); // overall run
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [showRawExtras, setShowRawExtras] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Debug / polling state
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  // no longer used, kept for compatibility with existing UI expectations
  const [isPreviewResult] = useState(false);

  // Pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [lastMode, setLastMode] = useState<Mode>("quick");

  // Remember URL in query params to decide re-run behavior
  const [initialUrl] = useState(urlParam || "");

  // Focus URL input on first load (delight factor)
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    // only focus if no pipeline is already running
    if (!pipelineRunIdParam) {
      const t = setTimeout(() => urlInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [pipelineRunIdParam]);

  const fetchIngestionData = useCallback(
    async (id: string, isCancelled: () => boolean = () => false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        }
        if (!isCancelled()) {
          setJob(json?.data ?? json);
        }
      } catch (err: any) {
        if (!isCancelled()) setError(String(err?.message || err));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    []
  );

  const fetchPipelineSnapshot = useCallback(async (runId: string) => {
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`;
      throw new Error(msg);
    }
    return json as PipelineSnapshot;
  }, []);

  async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);

      const status = snap?.run?.status;
      if (status === "succeeded" || status === "failed") return snap;
      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }

  async function startPipelineRun(ingestionIdToRun: string, mode: Mode) {
    setLastMode(mode);
    setGenerating(true);
    setError(null);

    const steps = mode === "quick" ? [...QUICK_STEPS] : [...FULL_STEPS];
    setStatusMessage(mode === "quick" ? "Running Quick SEO" : "Running Full Pipeline");

    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingestionId: ingestionIdToRun,
        triggerModule: "seo",
        steps,
        options: {
          seo: {
            profile: "medicalex_v1",
            strict: true,
            model: null,
          },
        },
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Pipeline start failed: ${res.status}`);
    }

    const newRunId = json?.pipelineRunId?.toString?.() || "";
    if (!newRunId) throw new Error("Pipeline start did not return pipelineRunId");

    setPipelineRunId(newRunId);

    // Persist runId into the URL so refresh keeps status visible
    const next = new URLSearchParams();
    next.set("ingestionId", ingestionIdToRun);
    if (urlInput) next.set("url", urlInput);
    next.set("pipelineRunId", newRunId);
    router.push(`/dashboard/seo?${next.toString()}`);

    return newRunId;
  }

  // Load ingestion when ingestionId present
  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    fetchIngestionData(ingestionId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchIngestionData, ingestionId]);

  // Load pipeline snapshot if pipelineRunId present
  useEffect(() => {
    if (!pipelineRunId) return;
    let cancelled = false;

    (async () => {
      try {
        const snap = await fetchPipelineSnapshot(pipelineRunId);
        if (!cancelled) setPipelineSnapshot(snap);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPipelineSnapshot, pipelineRunId]);

  // Poll ingest job until completed
  async function pollForIngestion(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");

    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
        if (res.status === 200) {
          const j = await res.json();
          setPollingState(`completed: ingestionId=${j.ingestionId}`);
          setStatusMessage("Ingestion completed");
          return j;
        }
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setPollingState(`waiting… ${elapsed}s`);
      } catch (e) {
        console.warn("pollForIngestion error", e);
        setPollingState(`error polling: ${String(e)}`);
      }
      await sleep(intervalMs);
    }

    setPollingState("timeout");
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
    setRawIngestResponse({ status: res.status, body: json });

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Ingest failed: ${res.status}`);
    }

    const possibleIngestionId = json?.ingestionId ?? json?.id ?? json?.data?.id ?? json?.data?.ingestionId ?? null;

    if (possibleIngestionId) {
      if (json?.status === "accepted" || res.status === 202) {
        const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId) throw new Error("Ingest did not return an ingestionId or jobId. Toggle Debug to inspect payload.");
    const pollResult = await pollForIngestion(jobId, 120_000, 3000);
    const newIngestionId = pollResult?.ingestionId ?? pollResult?.id ?? null;
    if (!newIngestionId) throw new Error("Polling returned no ingestionId. Toggle Debug to inspect payload.");
    return newIngestionId;
  }

  async function runMode(mode: Mode) {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setPipelineSnapshot(null);
    setLastMode(mode);

    try {
      let idToUse: string | null = null;
      const isSameAsInitial = Boolean(initialUrl && urlInput === initialUrl);

      if (ingestionId && isSameAsInitial) {
        idToUse = ingestionId;
      } else {
        // New URL run → create ingestion
        setJob(null);
        setRawIngestResponse(null);
        setPollingState(null);
        setPipelineRunId(null);
        setPipelineSnapshot(null);

        idToUse = await createIngestion(urlInput);

        const next = new URLSearchParams();
        next.set("ingestionId", idToUse);
        if (urlInput) next.set("url", urlInput);
        router.push(`/dashboard/seo?${next.toString()}`);
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      // Fetch ingestion immediately (so right pane shows something)
      await fetchIngestionData(idToUse);

      // Start pipeline
      const runId = await startPipelineRun(idToUse, mode);

      // Poll pipeline
      const timeout = mode === "quick" ? 180_000 : 300_000;
      await pollPipeline(runId, timeout, 2000);

      // Refresh ingestion for persisted SEO fields
      await fetchIngestionData(idToUse);

      setStatusMessage(mode === "quick" ? "Quick SEO completed" : "Full pipeline completed");
    } catch (e: any) {
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

  const seoPayload = jobData?.seo_payload ?? (jobData as any)?.seoPayload ?? null;

  const rawDescriptionHtml =
    jobData?.description_html ??
    (jobData as any)?.descriptionHtml ??
    (jobData as any)?.seo_payload?.description_html ??
    (jobData as any)?._debug?.description_html ??
    null;

  const descriptionHtml =
    typeof rawDescriptionHtml === "string" && rawDescriptionHtml.trim().length > 0 ? rawDescriptionHtml : null;

  const features = useMemo(() => {
    if (Array.isArray(jobData?.features)) return jobData.features;
    if (Array.isArray((jobData as any)?.seo_payload?.features)) return (jobData as any).seo_payload.features;
    return null;
  }, [jobData]);

  const highlightedDescription = useMemo(() => {
    if (!descriptionHtml) return "<em>No description generated yet</em>";
    if (!searchTerm) return descriptionHtml;
    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return descriptionHtml.replace(regex, '<mark class="bg-amber-200 text-gray-900 px-1 rounded-sm">$1</mark>');
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
    "keywords",
    "slug",
    "name_best",
  ];

  const parkedExtras = useMemo(() => {
    if (!seoPayload || typeof seoPayload !== "object") return [] as [string, any][];
    return Object.entries(seoPayload).filter(([key]) => !knownSeoKeys.includes(key));
  }, [seoPayload]);

  const handleCopyDescription = async () => {
    if (!descriptionHtml) return;
    try {
      await navigator.clipboard.writeText(descriptionHtml);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1400);
    } catch (err) {
      console.error("copy failed", err);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1400);
    }
  };

  const handleDownloadDescription = () => {
    if (!descriptionHtml) return;
    const blob = new Blob([descriptionHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avidia-seo-description-${ingestionId || "run"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSeo = Boolean(seoPayload || descriptionHtml || features);

  const moduleStatusByName = useMemo(() => {
    const map = new Map<string, PipelineModule>();
    for (const m of pipelineSnapshot?.modules ?? []) map.set(m.module_name, m);
    return map;
  }, [pipelineSnapshot]);

  const stepsForPills = useMemo(() => {
    const available = new Set((pipelineSnapshot?.modules ?? []).map((m) => m.module_name));
    if (available.size > 0) {
      const out: string[] = [];
      for (const name of FULL_STEPS) if (available.has(name)) out.push(name);
      return out.length ? out : lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];
    }
    return lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];
  }, [lastMode, pipelineSnapshot]);

  const statusPills = useMemo(() => {
    const pills: Array<{ key: string; label: string; state: "idle" | "active" | "done" | "failed" | "skipped"; hint: string }> = [];

    const ingestDone = Boolean(jobData?.status === "completed" || jobData?.normalized_payload || jobData?.completed_at);

    pills.push({
      key: "scrape",
      label: "Ingest",
      state: loading || pollingState ? "active" : ingestDone ? "done" : "idle",
      hint: pollingState || jobData?.status || (jobData?.normalized_payload ? "normalized" : "ready"),
    });

    for (const stepName of stepsForPills) {
      const m = moduleStatusByName.get(stepName);
      const tone = statusTone(m?.status);

      const state =
        tone === "done"
          ? "done"
          : tone === "failed"
          ? "failed"
          : tone === "skipped"
          ? "skipped"
          : tone === "active"
          ? "active"
          : "idle";

      pills.push({
        key: stepName,
        label:
          stepName === "extract"
            ? "Extract"
            : stepName === "seo"
            ? "SEO"
            : stepName === "audit"
            ? "Audit"
            : stepName === "import"
            ? "Import"
            : stepName === "monitor"
            ? "Monitor"
            : "Price",
        state,
        hint:
          state === "failed"
            ? (m?.error?.message ? String(m.error.message) : "failed")
            : state === "skipped"
            ? "skipped"
            : m?.status || "ready",
      });
    }

    pills.push({
      key: "preview",
      label: "Preview",
      state: hasSeo ? "done" : "idle",
      hint: hasSeo ? "rendered" : "waiting",
    });

    return pills;
  }, [hasSeo, jobData, loading, moduleStatusByName, pollingState, stepsForPills]);

  const runStatusTone = statusTone(pipelineSnapshot?.run?.status);
  const runStatusChip =
    runStatusTone === "done"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-500/40 dark:text-emerald-100"
      : runStatusTone === "failed"
      ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/70 dark:border-rose-500/40 dark:text-rose-100"
      : runStatusTone === "active"
      ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/70 dark:border-amber-500/40 dark:text-amber-100"
      : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/70 dark:border-slate-700 dark:text-slate-300";

  const demoUrl = "https://www.apple.com/iphone-17/";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background (subtle, premium) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-cyan-300/18 blur-3xl dark:bg-cyan-500/12" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-emerald-300/16 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.86)_54%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.88)_54%,_rgba(15,23,42,1)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-4 pb-10 lg:px-8 lg:pt-6 space-y-4">
        {/* Top bar: identity + run chips (tight, no empty space) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-cyan-500/40 dark:bg-slate-950/70 dark:text-cyan-100">
            <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 border border-cyan-300 dark:bg-slate-900 dark:border-cyan-400/60">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </span>
            AvidiaTech • AvidiaSEO
            {ingestionId && (
              <>
                <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                <span className="font-mono text-[10px]">ing:{safeTrunc(ingestionId, 18)}</span>
              </>
            )}
            {pipelineRunId && (
              <>
                <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                <span className="font-mono text-[10px]">run:{safeTrunc(pipelineRunId, 18)}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pipelineRunId && (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] shadow-sm ${runStatusChip}`}>
                <span className={`h-2 w-2 rounded-full ${runStatusTone === "active" ? "bg-amber-400 animate-pulse" : runStatusTone === "done" ? "bg-emerald-400" : runStatusTone === "failed" ? "bg-rose-400" : "bg-slate-400"}`} />
                <span className="font-medium">
                  {pipelineSnapshot?.run?.status ? pipelineSnapshot.run.status : "status unknown"}
                </span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowDebug((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-950"
            >
              <span className={`h-2 w-2 rounded-full ${showDebug ? "bg-cyan-400" : "bg-slate-400"}`} />
              Debug
            </button>
          </div>
        </div>

        {/* Big CTA card: URL first, above the fold */}
        <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 leading-tight">
                  Paste a product URL. Get store-ready SEO — fast.
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                  Quick SEO runs <span className="font-mono">extract → seo</span>. Full Pipeline adds audit, import, monitor, and pricing.
                </p>
              </div>

              {/* Compact tips */}
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 dark:bg-slate-950/60 dark:border-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-200">Tip:</span>
                  try Quick SEO first
                </div>
                {statusMessage && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-cyan-200 px-3 py-1.5 text-[11px] text-cyan-700 dark:bg-slate-950/60 dark:border-cyan-500/40 dark:text-cyan-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <label className="sr-only">Manufacturer URL</label>
                  <input
                    ref={urlInputRef}
                    value={urlInput}
                    onChange={(e) => {
                      const next = e.target.value;
                      setUrlInput(next);

                      setError(null);
                      setJob(null);
                      setRawIngestResponse(null);
                      setPollingState(null);

                      setPipelineRunId(null);
                      setPipelineSnapshot(null);
                      setShowRawExtras(false);
                      setSearchTerm("");
                    }}
                    placeholder="https://manufacturer.com/product..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 lg:w-[360px]">
                  <button
                    type="button"
                    onClick={() => runMode("quick")}
                    disabled={generating}
                    className="px-4 py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold shadow-sm hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px]"
                    title="Runs extract + seo"
                  >
                    {generating && lastMode === "quick" ? "Running…" : "Quick SEO"}
                  </button>

                  <button
                    type="button"
                    onClick={() => runMode("full")}
                    disabled={generating}
                    className="px-4 py-3 rounded-xl bg-slate-900 text-slate-50 text-sm font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    title="Runs extract + seo + audit + import + monitor + price"
                  >
                    {generating && lastMode === "full" ? "Running…" : "Full Pipeline"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-500">
                  Durable artifacts are recorded for every step you run.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(demoUrl);
                      setJob(null);
                      setRawIngestResponse(null);
                      setPollingState(null);
                      setPipelineRunId(null);
                      setPipelineSnapshot(null);
                      setError(null);
                      setStatusMessage("Demo URL loaded — choose a mode.");
                      urlInputRef.current?.focus();
                    }}
                    className="text-[11px] text-cyan-700 hover:text-cyan-600 underline underline-offset-4 dark:text-cyan-300 dark:hover:text-cyan-200"
                  >
                    Try a demo URL
                  </button>

                  {pipelineRunId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const snap = await fetchPipelineSnapshot(pipelineRunId);
                          setPipelineSnapshot(snap);
                        } catch (e: any) {
                          setError(String(e?.message || e));
                        }
                      }}
                      className="text-[11px] text-slate-700 hover:text-slate-900 underline underline-offset-4 dark:text-slate-300 dark:hover:text-white"
                    >
                      Refresh status
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Inline error (tight, directly under CTA) */}
          {error && (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6">
              <div className="rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-3 text-sm shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
                {error}
              </div>
            </div>
          )}
        </section>

        {/* Status + Structure row (no blank gaps) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status (pills) */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70 lg:col-span-2">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Run timeline
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Live module status
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {pollingState ? pollingState : generating ? "running…" : pipelineRunId ? "ready" : "idle"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {statusPills.map((pill) => {
                  const tone = pill.state;
                  const cls =
                    tone === "done"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-500/40 dark:text-emerald-100"
                      : tone === "failed"
                      ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/70 dark:border-rose-500/40 dark:text-rose-100"
                      : tone === "active"
                      ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/70 dark:border-amber-500/40 dark:text-amber-100"
                      : tone === "skipped"
                      ? "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-300"
                      : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/70 dark:border-slate-700 dark:text-slate-300";

                  const dot =
                    tone === "done"
                      ? "bg-emerald-400"
                      : tone === "failed"
                      ? "bg-rose-400"
                      : tone === "active"
                      ? "bg-amber-400 animate-pulse"
                      : tone === "skipped"
                      ? "bg-slate-400"
                      : "bg-slate-400 dark:bg-slate-500";

                  return (
                    <div key={pill.key} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-[11px] ${cls}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        <span className="font-medium truncate">{pill.label}</span>
                      </div>
                      <span className="text-[10px] opacity-90 truncate max-w-[120px]">{pill.hint}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEO structure quick view */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    SEO fields
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Structure</p>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{hasSeo ? "ready" : "waiting"}</span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 dark:text-slate-400">H1</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                    {seoPayload?.h1 ?? seoPayload?.name_best ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 dark:text-slate-400">Page title</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                    {seoPayload?.pageTitle ?? seoPayload?.title ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 dark:text-slate-400">Meta description</p>
                  <p className="text-slate-800 dark:text-slate-100 line-clamp-3">
                    {seoPayload?.metaDescription ?? seoPayload?.meta_description ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Output row: Viewer + Side utilities (packed, no blank space) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Viewer */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Output
                  </p>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50">
                    SEO description preview
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                    Generated and persisted by the pipeline. Copy HTML, export, or search inside the content.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-xs text-slate-50 border border-slate-900 shadow-sm hover:bg-slate-800 disabled:opacity-40 dark:bg-white/5 dark:border-white/25 dark:text-white dark:hover:bg-white/10"
                  >
                    {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy HTML"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-xs text-slate-50 font-semibold border border-slate-900 shadow-sm hover:-translate-y-[1px] transition disabled:opacity-40 disabled:shadow-none dark:bg-white dark:text-slate-900 dark:border-white/30"
                  >
                    Download
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:bg-white/5 dark:border-white/15">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search inside the description…"
                    className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-300"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-200">Live highlight</span>
                </div>

                <div className="rounded-3xl bg-white text-slate-900 shadow-inner border border-slate-200 overflow-hidden dark:bg-white dark:text-slate-900 dark:border-slate-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Rendered description</p>
                      <p className="text-xs text-slate-600 m-0">Matches your custom GPT instructions.</p>
                    </div>
                    {isPreviewResult && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
                        Preview only
                      </span>
                    )}
                  </div>

                  <div className="prose prose-slate max-w-none px-6 py-5 text-sm">
                    {descriptionHtml ? (
                      <article
                        className="prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h3:mt-4 prose-ul:list-disc prose-li:marker:text-slate-400"
                        dangerouslySetInnerHTML={{ __html: highlightedDescription }}
                      />
                    ) : (
                      <div className="text-slate-500 text-sm italic">
                        Paste a URL above and run <span className="font-semibold">Quick SEO</span> to generate your first output.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side utilities: Features + Extras */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Extracted
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Feature bullets</p>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {Array.isArray(features) && features.length ? `${features.length}` : "—"}
                  </span>
                </div>

                {Array.isArray(features) && features.length > 0 ? (
                  <ul className="mt-3 list-disc list-inside space-y-1 text-xs text-slate-800 dark:text-slate-100">
                    {features.slice(0, 12).map((feat: string, idx: number) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-slate-500 text-xs dark:text-slate-400">
                    No features captured yet. Run Quick SEO.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Extras</p>
                  {parkedExtras.length > 0 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{parkedExtras.length}</span>
                  )}
                </div>

                {parkedExtras.length > 0 ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowRawExtras((v) => !v)}
                      className="text-xs text-cyan-700 hover:text-cyan-600 underline underline-offset-4 dark:text-cyan-300 dark:hover:text-cyan-200"
                    >
                      {showRawExtras ? "Hide" : "Show"} parked extras
                    </button>

                    {showRawExtras && (
                      <pre className="mt-2 p-3 rounded-2xl bg-slate-900 text-[11px] text-slate-100 border border-slate-700 overflow-auto dark:bg-slate-950/70">
                        {JSON.stringify(Object.fromEntries(parkedExtras), null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Nothing extra yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Debug section (collapsed by default) */}
        {showDebug && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {jobData && ingestionId && (
              <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Normalized payload</h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{loading ? "loading…" : "ready"}</span>
                  </div>
                  <pre className="mt-3 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                    {JSON.stringify(jobData.normalized_payload ?? jobData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {rawIngestResponse && (
              <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Raw /api/v1/ingest response</h4>
                    {pollingState && <span className="text-[11px] text-slate-500 dark:text-slate-400">{pollingState}</span>}
                  </div>
                  <pre className="mt-3 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                    {JSON.stringify(rawIngestResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
