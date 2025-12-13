"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * Final UX goals:
 * - URL CTA is the first thing the user sees (above the fold).
 * - Two modes:
 *    - Quick SEO: ingest → poll → pipeline(extract+seo) → refresh ingestion
 *    - Full Pipeline: ingest → poll → pipeline(extract+seo+audit+import+monitor+price) → refresh ingestion
 * - No unnecessary empty space: compact, purposeful layout.
 * - Status reflects real module_runs + durable artifacts.
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

function moduleLabel(name: string) {
  switch (name) {
    case "extract":
      return "Extract";
    case "seo":
      return "SEO";
    case "audit":
      return "Audit";
    case "import":
      return "Import";
    case "monitor":
      return "Monitor";
    case "price":
      return "Price";
    default:
      return name;
  }
}

function statusToUiState(status?: ModuleRunStatus | PipelineRunStatus | null) {
  if (!status) return "idle";
  if (status === "running") return "active";
  if (status === "succeeded") return "done";
  if (status === "failed") return "error";
  if (status === "skipped") return "skipped";
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
    setStatusMessage("Pipeline running");
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);

      const status = snap?.run?.status;
      if (status === "succeeded" || status === "failed") return snap;

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
        options: { includeSeo: true },
      }),
    });

    const json = await res.json().catch(() => null);
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
    if (!jobId) throw new Error("Ingest did not return an ingestionId or jobId. See debug pane.");

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

        // Keep the user on this page with the new ingestion context
        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(idToUse)}`);
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      await fetchIngestionData(idToUse);

      const runId = await startPipelineRun(idToUse, mode);
      await pollPipeline(runId, mode === "quick" ? 180_000 : 300_000, 2000);

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

  const hasSeo = Boolean(seoPayload || descriptionHtml || features);

  const moduleStatusByName = useMemo(() => {
    const map = new Map<string, PipelineModule>();
    for (const m of pipelineSnapshot?.modules ?? []) map.set(m.module_name, m);
    return map;
  }, [pipelineSnapshot]);

  const stepsForPills = useMemo(() => {
    const presentSet = new Set((pipelineSnapshot?.modules ?? []).map((m) => m.module_name));
    if (presentSet.size > 0) {
      const ordered = [];
      for (const name of FULL_STEPS) if (presentSet.has(name)) ordered.push(name);
      return ordered.length ? ordered : lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];
    }
    return lastMode === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];
  }, [lastMode, pipelineSnapshot]);

  const statusPills = useMemo(() => {
    // We keep "Scrape/Normalize" as the first macro step, since ingestion happens before module runs
    const pills: Array<{
      key: string;
      label: string;
      state: "idle" | "active" | "done" | "error" | "skipped";
      hint: string;
    }> = [];

    const scrapeDone = Boolean(jobData?.normalized_payload || jobData?.completed_at);
    pills.push({
      key: "scrape",
      label: "Ingest",
      state: (loading || pollingState) && !scrapeDone ? "active" : scrapeDone ? "done" : "idle",
      hint: pollingState || jobData?.status || (scrapeDone ? "ready" : "waiting"),
    });

    for (const stepName of stepsForPills) {
      const m = moduleStatusByName.get(stepName);
      const ui = statusToUiState(m?.status);
      pills.push({
        key: stepName,
        label: moduleLabel(stepName),
        state: ui as any,
        hint: m?.status ?? "not run",
      });
    }

    pills.push({
      key: "review",
      label: "Preview",
      state: hasSeo ? "done" : "idle",
      hint: hasSeo ? "rendered" : "waiting",
    });

    return pills;
  }, [hasSeo, jobData, loading, moduleStatusByName, pollingState, stepsForPills]);

  const demoUrl = "https://www.apple.com/iphone-17/";

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

  const currentRunStatus = pipelineSnapshot?.run?.status ?? null;
  const runningText =
    generating || loading || pollingState || currentRunStatus === "running" ? "Running…" : pipelineRunId ? "Ready" : "Idle";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8 lg:py-6 space-y-4">
        {/* Top bar */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-cyan-500/40 dark:bg-slate-950/70 dark:text-cyan-100">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 border border-cyan-300 dark:bg-slate-900 dark:border-cyan-400/60">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </span>
              AvidiaSEO
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

            <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
              {runningText}
            </div>
          </div>

          {statusMessage && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-cyan-200 px-3 py-1.5 text-[11px] text-cyan-700 shadow-sm dark:bg-slate-950/70 dark:border-cyan-500/40 dark:text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {statusMessage}
            </div>
          )}
        </section>

        {/* Primary CTA card (above the fold) */}
        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:bg-slate-950/60 dark:border-slate-800">
          <div className="p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Copy */}
            <div className="lg:col-span-5 space-y-2">
              <h1 className="text-xl lg:text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-50">
                URL → production-ready SEO page
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Paste a manufacturer URL and run either{" "}
                <span className="font-semibold text-cyan-700 dark:text-cyan-200">Quick SEO</span>{" "}
                (fastest) or{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">Full Pipeline</span>{" "}
                (audit + import + monitoring).
              </p>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 dark:bg-slate-950/80 dark:border-slate-800">
                  <span className="font-mono text-slate-600 dark:text-slate-300">Quick</span>
                  <span className="text-slate-500 dark:text-slate-400">extract → seo</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 dark:bg-slate-950/80 dark:border-slate-800">
                  <span className="font-mono text-slate-600 dark:text-slate-300">Full</span>
                  <span className="text-slate-500 dark:text-slate-400">extract → seo → audit → import → monitor → price</span>
                </span>
              </div>
            </div>

            {/* Input + actions */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:bg-slate-950/60 dark:border-slate-800">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Manufacturer Product URL
                  </label>

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

                        setPipelineRunId(null);
                        setPipelineSnapshot(null);
                        setIsPreviewResult(false);
                      }}
                      placeholder="https://manufacturer.com/product/..."
                      className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
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
                        className="w-1/2 px-4 py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold shadow-sm hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition"
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
                        className="w-1/2 px-4 py-3 rounded-xl bg-slate-900 text-slate-50 text-sm font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:shadow-none transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        title="Runs extract + seo + audit + import + monitor + price"
                      >
                        {generating && lastMode === "full" ? "Running…" : "Full Pipeline"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                      You’ll get durable outputs (artifacts) for every module that runs.
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
                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                      Run: <span className="font-mono">{pipelineRunId}</span>
                      {pipelineSnapshot?.run?.status ? (
                        <span className="ml-2 text-slate-500 dark:text-slate-400">
                          (status: {pipelineSnapshot.run.status})
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Inline errors directly under CTA for instant clarity */}
              {error && (
                <div className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-3 text-sm shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Compact status + outputs row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Pipeline status */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Live status
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{runningText}</span>
            </div>

            <div className="mt-3 space-y-2">
              {statusPills.map((pill) => {
                const isDone = pill.state === "done";
                const isActive = pill.state === "active";
                const isError = pill.state === "error";
                const isSkipped = pill.state === "skipped";

                const cls =
                  isDone
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-100"
                    : isActive
                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-100"
                    : isError
                    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/40 dark:text-rose-100"
                    : isSkipped
                    ? "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-300";

                const dot =
                  isDone ? "bg-emerald-400" : isActive ? "bg-amber-400 animate-pulse" : isError ? "bg-rose-400" : "bg-slate-400";

                return (
                  <div
                    key={pill.key}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] ${cls}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                      <span className="font-medium truncate">{pill.label}</span>
                    </div>
                    <span className="text-[10px] truncate max-w-[55%]">{pill.hint}</span>
                  </div>
                );
              })}
            </div>

            {pipelineRunId && pipelineSnapshot?.modules?.length ? (
              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Outputs are stored in <span className="font-mono">pipeline-outputs</span> and linked via{" "}
                <span className="font-mono">module_runs.output_ref</span>.
              </div>
            ) : null}
          </div>

          {/* Description + viewer */}
          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-950/60 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 mb-1 dark:text-slate-400">
                    Description
                  </p>
                  <h3 className="text-lg sm:text-xl font-semibold">Premium HTML viewer</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    This is the HTML you can ship to your product page.
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
                      : "Copy HTML"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 font-semibold border border-slate-900 shadow-sm hover:-translate-y-[1px] transition disabled:opacity-40 disabled:shadow-none dark:bg-white dark:text-slate-900 dark:border-white/30"
                  >
                    Download HTML
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 dark:bg-white/5 dark:border-white/15">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in the generated HTML (highlights live)"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-300"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-200">Highlight</span>
              </div>
            </div>

            <div className="px-6 py-5">
              {isPreviewResult && (
                <div className="mb-3 inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold px-3 py-1">
                  Preview only
                </div>
              )}

              <div className="prose prose-slate max-w-none text-sm dark:prose-invert">
                {descriptionHtml ? (
                  <article
                    className="prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h3:mt-4 prose-ul:list-disc prose-li:marker:text-slate-400"
                    dangerouslySetInnerHTML={{ __html: highlightedDescription }}
                  />
                ) : (
                  <div className="text-slate-500 text-sm italic">
                    Paste a URL above and run Quick SEO to generate the description.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Details row: SEO structure + features + debug */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SEO structure */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">SEO structure</h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">From SEO output</span>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800">
                <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">H1</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{seoPayload?.h1 ?? seoPayload?.name_best ?? "—"}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800">
                <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Page title</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{seoPayload?.pageTitle ?? seoPayload?.title ?? "—"}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800">
                <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Meta description</p>
                <p className="text-slate-800 leading-relaxed dark:text-slate-100">
                  {seoPayload?.metaDescription ?? seoPayload?.meta_description ?? "—"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/50 dark:border-slate-800">
                <p className="text-[11px] uppercase text-slate-500 mb-1 dark:text-slate-400">Short description</p>
                <p className="text-slate-800 dark:text-slate-100">
                  {seoPayload?.seoShortDescription ?? seoPayload?.seo_short_description ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Features + extras */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Feature bullets</h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {Array.isArray(features) ? `${features.length} items` : "—"}
              </span>
            </div>

            <div className="mt-3">
              {Array.isArray(features) && features.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 dark:text-slate-100">
                  {features.map((feat: string, idx: number) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-xs dark:text-slate-400">Run Quick SEO to generate feature bullets.</p>
              )}
            </div>

            {parkedExtras.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
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

          {/* Debug / context */}
          <div className="lg:col-span-4 space-y-4">
            {/* Ingestion payload */}
            {jobData && ingestionId && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Normalized payload</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Ingestion</span>
                </div>
                <pre className="mt-3 bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                  {JSON.stringify(jobData.normalized_payload ?? jobData, null, 2)}
                </pre>
              </div>
            )}

            {/* Raw ingest response */}
            {rawIngestResponse && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Raw /api/v1/ingest</h4>
                  {pollingState && <span className="text-[11px] text-slate-500 dark:text-slate-400">{pollingState}</span>}
                </div>
                <pre className="mt-3 bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words dark:bg-slate-950/70">
                  {JSON.stringify(rawIngestResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Pipeline modules snapshot */}
            {pipelineRunId && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Module runs</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">pipeline_runs</span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {(pipelineSnapshot?.modules ?? []).length ? (
                    (pipelineSnapshot?.modules ?? [])
                      .slice()
                      .sort((a, b) => a.module_index - b.module_index)
                      .map((m) => (
                        <div
                          key={`${m.module_index}-${m.module_name}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                              {m.module_index}. {moduleLabel(m.module_name)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              output_ref: {m.output_ref ?? "—"}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">{m.status}</div>
                        </div>
                      ))
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400">No modules found yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
