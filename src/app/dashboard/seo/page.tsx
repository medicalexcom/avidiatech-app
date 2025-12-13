"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * Modes:
 * - Quick SEO: ingest → poll → pipeline(extract+seo) → refresh ingestion
 * - Full Pipeline: ingest → poll → pipeline(extract+seo+audit+import+monitor+price) → refresh ingestion
 *
 * Notes:
 * - We no longer call /api/v1/seo directly from this page.
 * - Both modes still create pipeline_runs + module_runs so there is always traceability and durable artifacts.
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

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;
  const pipelineRunIdParam = params?.get("pipelineRunId") || null;

  const ingestionId = ingestionIdParam;

  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [showRawExtras, setShowRawExtras] = useState(false);

  // Debug / polling state
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  // We no longer support front-end "preview persist:false" for /api/v1/seo
  const [isPreviewResult, setIsPreviewResult] = useState(false);

  // Pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [lastMode, setLastMode] = useState<Mode>("quick");

  // Remember the URL that came from query params; used to decide if we should reuse ingestionId
  const [initialUrl] = useState(urlParam || "");

  const fetchIngestionData = useCallback(
    async (id: string, isCancelled: () => boolean = () => false) => {
      setLoading(true);
      setError(null);
      setStatusMessage("Refreshing ingestion");
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        }
        if (!isCancelled()) {
          // API returns either the row directly or wrapped in { data }
          setJob(json?.data ?? json);
          setStatusMessage("Ingestion ready");
        }
      } catch (err: any) {
        if (!isCancelled()) {
          setError(String(err?.message || err));
          setStatusMessage(null);
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    []
  );

  const fetchPipelineSnapshot = useCallback(
    async (runId: string) => {
      const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`;
        throw new Error(msg);
      }
      return json as PipelineSnapshot;
    },
    []
  );

  async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2000) {
    const start = Date.now();
    setStatusMessage("Pipeline running");
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);

      const status = snap?.run?.status;
      if (status === "succeeded" || status === "failed") {
        return snap;
      }
      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }

  async function startPipelineRun(ingestionId: string, mode: Mode) {
    setLastMode(mode);
    setGenerating(true);
    setError(null);
    setIsPreviewResult(false);

    const steps = mode === "quick" ? [...QUICK_STEPS] : [...FULL_STEPS];
    setStatusMessage(mode === "quick" ? "Starting Quick SEO pipeline" : "Starting Full pipeline");

    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingestionId,
        triggerModule: "seo",
        steps,
        options: {
          seo: {
            // keep this optional—runner currently ignores it but artifact records it
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
    router.push(
      `/dashboard/seo?ingestionId=${encodeURIComponent(ingestionId)}&pipelineRunId=${encodeURIComponent(newRunId)}`
    );

    return newRunId;
  }

  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    setStatusMessage("Loading ingestion");
    fetchIngestionData(ingestionId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchIngestionData, ingestionId]);

  useEffect(() => {
    if (!pipelineRunId) return;
    let cancelled = false;

    (async () => {
      try {
        setStatusMessage("Loading pipeline run");
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

  // Polling helper: polls /api/v1/ingest/job/:jobId until ingestion row is completed (normalized_payload or status completed)
  async function pollForIngestion(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
        // 200 -> completed; 202 -> still processing
        if (res.status === 200) {
          const j = await res.json();
          setPollingState(`completed: ingestionId=${j.ingestionId}`);
          setStatusMessage("Ingestion completed");
          return j; // { ingestionId, normalized_payload, status }
        }
        // still pending
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setPollingState(`waiting... ${elapsed}s`);
      } catch (e) {
        console.warn("pollForIngestion error", e);
        setPollingState(`error polling: ${String(e)}`);
        setStatusMessage(null);
      }
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
        options: { includeSeo: true }, // request SEO extraction during ingestion
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
      // If accepted async, poll until completed
      if (json?.status === "accepted" || res.status === 202) {
        const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId) {
      throw new Error("Ingest did not return an ingestionId or jobId. See debug pane.");
    }

    const pollResult = await pollForIngestion(jobId, 120_000, 3000);
    const newIngestionId = pollResult?.ingestionId ?? pollResult?.id ?? null;
    if (!newIngestionId) throw new Error("Polling returned no ingestionId. See debug pane.");
    return newIngestionId;
  }

  async function runMode(mode: Mode) {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setIsPreviewResult(false);
    setPipelineSnapshot(null);

    try {
      // Decide ingestionId to use
      let idToUse: string | null = null;

      const isSameAsInitial = Boolean(initialUrl && urlInput === initialUrl);

      if (ingestionId && isSameAsInitial) {
        idToUse = ingestionId;
      } else {
        // New URL run: clear previous outputs and create new ingestion
        setJob(null);
        setRawIngestResponse(null);
        setPollingState(null);
        setStatusMessage(null);

        idToUse = await createIngestion(urlInput);
        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(idToUse)}`);
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      // Refresh ingestion immediately
      await fetchIngestionData(idToUse);

      // Start pipeline
      const runId = await startPipelineRun(idToUse, mode);

      // Poll pipeline
      await pollPipeline(runId, mode === "quick" ? 180_000 : 300_000, 2000);

      // Refresh ingestion to show persisted SEO fields
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
    // allow shapes: { ok, data }, { data }, plain row, or nested { data: { data } }
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
      setTimeout(() => setCopyState("idle"), 1500);
    } catch (err) {
      console.error("copy failed", err);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  const handleDownloadDescription = () => {
    if (!descriptionHtml) return;
    const blob = new Blob([descriptionHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avidia-seo-description-${ingestionId || "preview"}.html`;
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
    // If we have a run and module list, we can infer what ran.
    // Else use lastMode (default quick).
    const available = new Set((pipelineSnapshot?.modules ?? []).map((m) => m.module_name));
    if (available.size > 0) {
      // preserve canonical order
      const out = [];
      for (const name of FULL_STEPS) if (available.has(name)) out.push(name);
      return out.length ? out : (lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS]);
    }
    return lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];
  }, [lastMode, pipelineSnapshot]);

  const statusPills = useMemo(() => {
    const pills = [];

    // Ingestion (scrape/normalize) still uses polling + ingestion row presence
    pills.push({
      key: "scrape",
      label: "Scraping & Normalizing",
      state:
        loading || pollingState
          ? "active"
          : jobData?.status === "completed" || jobData?.normalized_payload || jobData?.completed_at
          ? "done"
          : "idle",
      hint: pollingState || jobData?.status || (jobData?.normalized_payload ? "normalized" : "waiting"),
    });

    for (const stepName of stepsForPills) {
      if (stepName === "extract") {
        const m = moduleStatusByName.get("extract");
        pills.push({
          key: "extract",
          label: "Extract module",
          state: m?.status === "running" ? "active" : m?.status === "succeeded" ? "done" : m?.status === "failed" ? "idle" : "idle",
          hint: m?.status || "ready",
        });
        continue;
      }

      if (stepName === "seo") {
        const m = moduleStatusByName.get("seo");
        pills.push({
          key: "seo",
          label: "AvidiaSEO Generation",
          state: generating || m?.status === "running" ? "active" : hasSeo || m?.status === "succeeded" ? "done" : "idle",
          hint: m?.status ? `module: ${m.status}` : generating ? "starting" : hasSeo ? "SEO saved" : "ready",
        });
        continue;
      }

      // For future modules, show module status if present
      const m = moduleStatusByName.get(stepName);
      pills.push({
        key: stepName,
        label: `${stepName[0].toUpperCase()}${stepName.slice(1)} module`,
        state: m?.status === "running" ? "active" : m?.status === "succeeded" ? "done" : m?.status === "skipped" ? "idle" : "idle",
        hint: m?.status || "not run",
      });
    }

    pills.push({
      key: "review",
      label: "Human-ready Preview",
      state: hasSeo ? "done" : "idle",
      hint: hasSeo ? "Rendered" : "awaiting generation",
    });

    return pills;
  }, [generating, hasSeo, jobData, loading, moduleStatusByName, pollingState, stepsForPills]);

  const demoUrl = "https://www.apple.com/iphone-17/";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background treatment (kept, subtle) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-300/22 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      {/* Compact Cluster-style wrapper */}
      <div className="relative mx-auto max-w-7xl px-4 pt-4 pb-8 space-y-6 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HEADER + TOP FLOW (Cluster-aligned, efficient) */}
        <section className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch">
          {/* Left: compact header + value props */}
          <div className="flex-1 min-w-[260px] space-y-4">
            {/* Module pill row */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-cyan-500/40 dark:bg-slate-950/80 dark:text-cyan-100">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 border border-cyan-300 dark:bg-slate-900 dark:border-cyan-400/60">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </span>
              AvidiaTech • AvidiaSEO
              {ingestionId && (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">{ingestionId.slice(0, 8)}…</span>
                </>
              )}
              {pipelineRunId && (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">run:{pipelineRunId.slice(0, 8)}…</span>
                </>
              )}
            </div>

            {/* Title + subtitle (Cluster typography) */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight dark:text-slate-50">
                Turn any manufacturer URL into a{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 dark:from-cyan-300 dark:via-sky-400 dark:to-emerald-300">
                  production-ready SEO page
                </span>
                .
              </h1>
              <p className="text-sm text-slate-600 max-w-xl dark:text-slate-300">
                Paste a product URL to run Quick SEO, or run the Full Pipeline when you’re ready for audit/import/monitor/price.
              </p>
            </div>

            {/* Callout row (Compact guidance + status pill) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-cyan-200 px-3 py-1.5 text-[11px] shadow-sm dark:bg-slate-950/80 dark:border-cyan-500/30">
                <span className="text-[11px] font-semibold text-cyan-700 uppercase tracking-[0.16em] dark:text-cyan-200">
                  Step 1
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  Paste the manufacturer URL in the{" "}
                  <span className="font-semibold text-cyan-700 dark:text-cyan-200">URL box directly below</span>.
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm dark:bg-slate-950/80 dark:border-slate-700 dark:text-slate-300">
                <span className="text-xs">⬇</span>
                <span>Step 2 — choose Quick SEO or Full Pipeline.</span>
              </div>
              {statusMessage && (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-cyan-200 px-3 py-1.5 text-[11px] text-cyan-700 shadow-sm dark:bg-slate-950/80 dark:border-cyan-500/40 dark:text-cyan-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          {/* Right: flow + live pipeline snapshot */}
          <div className="w-full lg:w-[430px] xl:w-[480px] flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Real-time pipeline
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {loading || generating ? "Running…" : pipelineRunId ? "Ready" : "Idle"}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              {/* Visual flow */}
              <div className="flex-1 rounded-2xl bg-white/95 border border-slate-200 px-4 py-3 space-y-2 shadow-sm dark:bg-slate-950/80 dark:border-slate-700/80">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Pipeline steps
                </p>
                <ol className="space-y-2.5 text-xs mt-1">
                  {statusPills.map((pill, index) => {
                    const isDone = pill.state === "done";
                    const isActive = pill.state === "active";
                    return (
                      <li key={pill.key} className="flex items-center gap-3 relative">
                        <div className="flex flex-col items-center">
                          <div
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm",
                              isDone
                                ? "bg-emerald-400 text-slate-900 border-emerald-300 shadow-emerald-500/40"
                                : isActive
                                ? "bg-cyan-500 text-slate-900 border-cyan-300 animate-pulse shadow-cyan-500/40"
                                : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-600",
                            ].join(" ")}
                          >
                            {index + 1}
                          </div>
                          {index < statusPills.length - 1 && (
                            <div
                              className={[
                                "mt-1 h-6 w-px",
                                isDone || isActive
                                  ? "bg-gradient-to-b from-cyan-400 via-emerald-400 to-transparent"
                                  : "bg-slate-200 dark:bg-slate-700",
                              ].join(" ")}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-medium text-slate-800 dark:text-slate-100">{pill.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{pill.hint}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Live status */}
              <div className="flex-1 rounded-2xl bg-white/95 border border-slate-200 px-4 py-3 space-y-2 shadow-sm dark:bg-slate-950/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Live pipeline status
                  </p>
                  {loading && <span className="text-[11px] text-slate-500 dark:text-slate-400">Loading…</span>}
                </div>
                <div className="space-y-2 mt-1">
                  {statusPills.map((pill) => (
                    <div
                      key={pill.key}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[11px] ${
                        pill.state === "done"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-500/40 dark:text-emerald-100"
                          : pill.state === "active"
                          ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/70 dark:border-amber-500/40 dark:text-amber-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/70 dark:border-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            pill.state === "done"
                              ? "bg-emerald-400"
                              : pill.state === "active"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-slate-400 dark:bg-slate-500"
                          }`}
                        />
                        <span className="font-medium">{pill.label}</span>
                      </div>
                      <span className="text-[10px]">{pill.hint}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 dark:text-slate-500">
                  This reflects real module_runs + durable artifacts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-3 text-sm shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main work column */}
          <div className="lg:col-span-2 space-y-4">
            {/* URL + Generate */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 lg:p-5 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">AvidiaSEO</h4>
                  <p className="text-xs text-slate-600 max-w-xl dark:text-slate-400">
                    Quick SEO runs <span className="font-mono">extract → seo</span>. Full Pipeline runs{" "}
                    <span className="font-mono">extract → seo → audit → import → monitor → price</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={urlInput}
                    onChange={(e) => {
                      const next = e.target.value;
                      setUrlInput(next);

                      // New run intent: clear view state
                      setJob(null);
                      setRawIngestResponse(null);
                      setPollingState(null);
                      setStatusMessage(null);
                      setError(null);

                      // Pipeline state should reset when URL changes
                      setPipelineRunId(null);
                      setPipelineSnapshot(null);
                      setIsPreviewResult(false);
                    }}
                    placeholder="https://manufacturer.com/product..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
                    type="url"
                  />

                  <div className="flex gap-2 sm:w-[360px] w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        runMode("quick");
                      }}
                      disabled={generating}
                      className="w-1/2 px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold shadow-sm hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px]"
                      title="Runs extract + seo"
                    >
                      {generating && lastMode === "quick" ? "Running…" : "Quick SEO"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        runMode("full");
                      }}
                      disabled={generating}
                      className="w-1/2 px-4 py-3 rounded-lg bg-slate-900 text-slate-50 text-sm font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                      title="Runs extract + seo + audit + import + monitor + price"
                    >
                      {generating && lastMode === "full" ? "Running…" : "Full Pipeline"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-500">
                    Both modes create a pipeline run and durable artifacts. Quick SEO is the fastest path to an SEO-ready description.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(demoUrl);
                      setJob(null);
                      setRawIngestResponse(null);
                      setPollingState(null);
                      setPipelineRunId(null);
                      setPipelineSnapshot(null);
                      setStatusMessage("Demo URL loaded — choose Quick SEO or Full Pipeline");
                      setError(null);
                    }}
                    className="text-[11px] text-cyan-700 hover:text-cyan-600 underline underline-offset-4 dark:text-cyan-300 dark:hover:text-cyan-200"
                  >
                    Try a demo URL
                  </button>
                </div>

                {pipelineRunId && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Pipeline run:{" "}
                    <span className="font-mono">{pipelineRunId}</span>{" "}
                    {pipelineSnapshot?.run?.status ? (
                      <span className="ml-2">(status: {pipelineSnapshot.run.status})</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Premium HTML viewer */}
            <div className="rounded-2xl bg-white text-slate-900 shadow-sm p-5 border border-slate-200 dark:bg-slate-900/85 dark:text-white dark:border-slate-700/80">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 mb-1 dark:text-slate-400">
                    Description window
                  </p>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-1">Premium HTML viewer</h3>
                  <p className="text-slate-600 text-xs max-w-2xl dark:text-slate-300">
                    See the final copy exactly as it will appear on a product page. Highlight any claim, copy it into your CMS, or export the HTML.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 border border-slate-900 shadow-sm hover:bg-slate-800 disabled:opacity-40 dark:bg-white/5 dark:border-white/25 dark:text-white dark:hover:bg-white/10"
                  >
                    {copyState === "copied"
                      ? "Copied!"
                      : copyState === "error"
                      ? "Copy failed"
                      : "Copy description"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 font-semibold border border-slate-900 shadow-sm hover:-translate-y-[1px] transition disabled:opacity-40 disabled:shadow-none dark:bg-white dark:text-slate-900 dark:border-white/30"
                  >
                    Download HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm((prev) => prev.trim())}
                    className="px-3 py-2 rounded-lg bg-amber-400 text-xs text-slate-900 font-semibold shadow-sm hover:bg-amber-300"
                  >
                    Search in text
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 dark:bg-white/5 dark:border-white/15">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search headline, claims, or FAQs"
                    className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-300"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-200">Live highlight</span>
                </div>

                <div className="rounded-2xl bg-white text-slate-900 shadow-inner border border-slate-200 overflow-hidden dark:bg-white dark:text-slate-900 dark:border-slate-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 dark:bg-slate-50">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Rendered description</p>
                      <p className="text-xs text-slate-600 m-0">
                        Mirrors your custom GPT instructions — headings, lists, disclaimers, and manuals stay structured.
                      </p>
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
                        No description generated yet. Paste a URL above and run Quick SEO or Full Pipeline.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side column: structure, features, debug */}
          <div className="space-y-4">
            {/* SEO structure */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">SEO structure</h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Driven by custom instructions
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">H1</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {seoPayload?.h1 ?? seoPayload?.name_best ?? "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Page title</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {seoPayload?.pageTitle ?? seoPayload?.title ?? "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Meta description</p>
                  <p className="text-slate-800 leading-relaxed dark:text-slate-100">
                    {seoPayload?.metaDescription ?? seoPayload?.meta_description ?? "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-700">
                  <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Short description</p>
                  <p className="text-slate-800 dark:text-slate-100">
                    {seoPayload?.seoShortDescription ?? seoPayload?.seo_short_description ?? "Not yet generated"}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Feature bullets</h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">From SEO output</span>
              </div>
              {Array.isArray(features) && features.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 dark:text-slate-100">
                  {features.map((feat: string, idx: number) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-xs dark:text-slate-400">
                  No features captured yet. Run Quick SEO to generate.
                </p>
              )}

              {parkedExtras.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowRawExtras((v) => !v)}
                    className="text-xs text-cyan-700 hover:text-cyan-600 underline underline-offset-4 dark:text-cyan-300 dark:hover:text-cyan-200"
                  >
                    {showRawExtras ? "Hide" : "Show"} parked extras ({parkedExtras.length})
                  </button>
                  {showRawExtras && (
                    <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-[11px] text-slate-100 border border-slate-700 overflow-auto dark:bg-slate-950/70">
                      {JSON.stringify(Object.fromEntries(parkedExtras), null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Debug: Source payload */}
            {jobData && ingestionId && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Source payload (normalized)</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Live from ingestion</span>
                </div>
                <pre className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                  {JSON.stringify(jobData.normalized_payload ?? jobData, null, 2)}
                </pre>
              </div>
            )}

            {/* Debug: raw ingest response */}
            {rawIngestResponse && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Raw /api/v1/ingest response</h4>
                  {pollingState && <span className="text-[11px] text-slate-500 dark:text-slate-400">{pollingState}</span>}
                </div>
                <pre className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                  {JSON.stringify(rawIngestResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
