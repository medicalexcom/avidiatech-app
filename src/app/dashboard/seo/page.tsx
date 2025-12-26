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

function safeDateMs(v?: string | null) {
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  const [isPreviewResult] = useState(false);

  // Pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [lastMode, setLastMode] = useState<Mode>("quick");

  // Live UI
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [localRunStartMs, setLocalRunStartMs] = useState<number | null>(null);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  // Remember the URL that came from query params; used to decide if we should reuse ingestionId
  const [initialUrl] = useState(urlParam || "");

  // keep a steady clock for elapsed timers + “last updated”
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // recent URLs (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("avidia:seo:recentUrls");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        setRecentUrls(parsed.filter((x) => typeof x === "string").slice(0, 6));
    } catch {
      // ignore
    }
  }, []);

  const rememberUrl = (u: string) => {
    const cleaned = (u || "").trim();
    if (!cleaned) return;
    setRecentUrls((prev) => {
      const next = [cleaned, ...prev.filter((x) => x !== cleaned)].slice(0, 6);
      try {
        localStorage.setItem("avidia:seo:recentUrls", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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
    setStatusMessage("Pipeline running");
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);
      setLastUpdatedAt(Date.now());

      const status = snap?.run?.status;
      if (status === "succeeded" || status === "failed") return snap;

      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }

  async function startPipelineRun(ingestionIdToUse: string, mode: Mode) {
    setLastMode(mode);
    setGenerating(true);
    setError(null);

    const steps = mode === "quick" ? [...QUICK_STEPS] : [...FULL_STEPS];
    setStatusMessage(mode === "quick" ? "Starting Quick SEO pipeline" : "Starting Full pipeline");

    // local clock start (helps even if API doesn’t include started_at yet)
    setLocalRunStartMs(Date.now());

    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingestionId: ingestionIdToUse,
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
    setLastUpdatedAt(Date.now());

    router.push(
      `/dashboard/seo?ingestionId=${encodeURIComponent(
        ingestionIdToUse
      )}&pipelineRunId=${encodeURIComponent(newRunId)}`
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
        if (!cancelled) {
          setPipelineSnapshot(snap);
          setLastUpdatedAt(Date.now());
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPipelineSnapshot, pipelineRunId]);

  // Auto-refresh pipeline snapshot when running
  useEffect(() => {
    if (!pipelineRunId) return;
    if (!autoRefresh) return;

    let stopped = false;
    const tick = setInterval(async () => {
      if (stopped) return;
      try {
        const snap = await fetchPipelineSnapshot(pipelineRunId);
        setPipelineSnapshot(snap);
        setLastUpdatedAt(Date.now());

        const status = snap?.run?.status;
        if (status === "succeeded" || status === "failed") {
          clearInterval(tick);
        }
      } catch {
        // don’t spam error banners while polling; leave last known state
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [autoRefresh, fetchPipelineSnapshot, pipelineRunId]);

  // Polling helper: polls /api/v1/ingest/job/:jobId until ingestion row is completed
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

  // Synchronous preview GET used by Extract as a fallback — returns parsed JSON or null
  async function trySynchronousPreview(jobId: string, url: string) {
    try {
      const target = `/api/v1/ingest/${encodeURIComponent(jobId)}?url=${encodeURIComponent(url)}`;
      const res = await fetch(target, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const text = await res.text().catch(() => "");
      try {
        const j = JSON.parse(text || "{}");
        return j;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
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
      const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;

      const preview = await trySynchronousPreview(jobId, url);
      if (preview) {
        const normalized =
          preview?.normalized_payload ?? preview?.data?.normalized_payload ?? preview?.data ?? preview;
        const hasNormalized =
          normalized != null &&
          typeof normalized === "object" &&
          Object.keys(normalized).length > 0;
        if (hasNormalized) {
          return preview?.id ?? possibleIngestionId;
        }
      }

      if (json?.status === "accepted" || res.status === 202) {
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId) throw new Error("Ingest did not return an ingestionId or jobId. See debug pane.");

    const preview = await trySynchronousPreview(jobId, url);
    if (preview) {
      const normalized = preview?.normalized_payload ?? preview?.data?.normalized_payload ?? preview?.data ?? preview;
      const hasNormalized =
        normalized != null &&
        typeof normalized === "object" &&
        Object.keys(normalized).length > 0;
      if (hasNormalized) {
        return preview?.id ?? jobId;
      }
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
    setPipelineSnapshot(null);

    const trimmed = (urlInput || "").trim();
    rememberUrl(trimmed);

    try {
      let idToUse: string | null = null;
      const isSameAsInitial = Boolean(initialUrl && trimmed === initialUrl);

      if (ingestionId && isSameAsInitial) {
        idToUse = ingestionId;
      } else {
        setJob(null);
        setRawIngestResponse(null);
        setPollingState(null);
        setStatusMessage(null);

        idToUse = await createIngestion(trimmed);
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

  const handlePasteUrl = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      const next = (txt || "").trim();
      if (!next) return;
      setUrlInput(next);
      setJob(null);
      setRawIngestResponse(null);
      setPollingState(null);
      setStatusMessage("Pasted from clipboard — choose Quick SEO or Full Pipeline");
      setError(null);
      setPipelineRunId(null);
      setPipelineSnapshot(null);
    } catch {
      // ignore (clipboard permissions)
    }
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
    const pills: Array<{ key: string; label: string; state: "idle" | "active" | "done"; hint: string }> = [];

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
      const m = moduleStatusByName.get(stepName);
      if (stepName === "seo") {
        pills.push({
          key: "seo",
          label: "AvidiaSEO Generation",
          state: generating || m?.status === "running" ? "active" : hasSeo || m?.status === "succeeded" ? "done" : "idle",
          hint: m?.status ? `module: ${m.status}` : generating ? "starting" : hasSeo ? "SEO saved" : "ready",
        });
        continue;
      }
      if (stepName === "extract") {
        pills.push({
          key: "extract",
          label: "Extract module",
          state: m?.status === "running" ? "active" : m?.status === "succeeded" ? "done" : "idle",
          hint: m?.status || "ready",
        });
        continue;
      }
      pills.push({
        key: stepName,
        label: `${stepName[0].toUpperCase()}${stepName.slice(1)} module`,
        state: m?.status === "running" ? "active" : m?.status === "succeeded" ? "done" : "idle",
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

  // progress + elapsed
  const progress = useMemo(() => {
    const total = statusPills.length || 1;
    const done = statusPills.filter((p) => p.state === "done").length;
    const active = statusPills.find((p) => p.state === "active")?.label ?? null;
    const pct = clamp(Math.round((done / total) * 100), 0, 100);
    return { total, done, pct, active };
  }, [statusPills]);

  const runStartedAtMs = useMemo(() => {
    const fromApi =
      safeDateMs((pipelineSnapshot?.run as any)?.started_at) ??
      safeDateMs((pipelineSnapshot?.run as any)?.created_at);
    return fromApi ?? localRunStartMs;
  }, [localRunStartMs, pipelineSnapshot]);

  const elapsedLabel = useMemo(() => {
    if (!runStartedAtMs) return "—";
    return formatDuration(nowTick - runStartedAtMs);
  }, [nowTick, runStartedAtMs]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return "—";
    const delta = nowTick - lastUpdatedAt;
    if (delta < 2000) return "just now";
    return `${Math.round(delta / 1000)}s ago`;
  }, [lastUpdatedAt, nowTick]);

  const moduleRuntimeBadges = useMemo(() => {
    const mods = pipelineSnapshot?.modules ?? [];
    return mods
      .slice()
      .sort((a, b) => (a.module_index ?? 0) - (b.module_index ?? 0))
      .map((m) => {
        const s = safeDateMs(m.started_at);
        const f = safeDateMs(m.finished_at);
        const d = s && f ? f - s : null;
        return {
          key: m.module_name,
          status: m.status,
          duration: d != null ? formatDuration(d) : m.status === "running" && s ? formatDuration(nowTick - s) : "—",
          output_ref: m.output_ref ?? null,
          error: m.error ?? null,
        };
      });
  }, [nowTick, pipelineSnapshot]);

  const demoUrl = "https://www.apple.com/iphone-17/";

  const headlineAccent =
    "bg-[linear-gradient(90deg,rgba(34,211,238,1),rgba(56,189,248,1),rgba(52,211,153,1),rgba(244,114,182,1),rgba(250,204,21,1))]";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Animated headline gradient + glow */}
      <style jsx>{`
        .hero-gradient {
          background-size: 200% 200%;
          animation: heroGradient 7s ease-in-out infinite;
        }
        @keyframes heroGradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .hero-glow {
          text-shadow: 0 0 32px rgba(34, 211, 238, 0.25), 0 0 48px rgba(52, 211, 153, 0.18);
        }
      `}</style>

      {/* Background treatment (ONLY this block changed) */}
      <div className="pointer-events-none absolute inset-0">
        {/* premium corner glows (Extract/Describe style) */}
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/18" />
        <div className="absolute -bottom-44 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/16" />
        <div className="absolute top-24 right-10 h-56 w-56 rounded-full bg-amber-300/12 blur-3xl dark:bg-amber-500/10" />

        {/* wash */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-4 pb-10 lg:px-8 lg:pt-6">
        {/* HERO + COMMAND BAR (above the fold) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          {/* Left: headline + command bar */}
          <div className="lg:col-span-7 space-y-4">
            {/* Module pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:bg-slate-950/70 dark:border-cyan-400/50">
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

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight dark:text-slate-50">
                Turn any manufacturer URL into a{" "}
                <span className={["bg-clip-text text-transparent hero-gradient hero-glow", headlineAccent].join(" ")}>
                  production-ready SEO page
                </span>
                .
              </h1>
              <p className="text-sm text-slate-600 max-w-xl dark:text-slate-300">
                Paste a product URL and run Quick SEO (fast) or the Full Pipeline (audit/import/monitor/price) when you’re ready to ship.
              </p>
            </div>

            {/* Command bar (URL is the hero) */}
            <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-sm p-3.5 dark:bg-slate-950/70 dark:border-slate-700/70">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Manufacturer product URL
                    </label>
                    <input
                      value={urlInput}
                      onChange={(e) => {
                        const next = e.target.value;
                        setUrlInput(next);

                        setJob(null);
                        setRawIngestResponse(null);
                        setPollingState(null);
                        setStatusMessage(null);
                        setError(null);

                        setPipelineRunId(null);
                        setPipelineSnapshot(null);
                      }}
                      placeholder="https://manufacturer.com/product..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 text-sm"
                      type="url"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>

                  <div className="sm:w-[310px] w-full">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Run mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          runMode("quick");
                        }}
                        disabled={generating}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold shadow-sm hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition-transform"
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
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-50 text-sm font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:shadow-none transition-transform"
                        title="Runs extract + seo + audit + import + monitor + price"
                      >
                        {generating && lastMode === "full" ? "Running…" : "Full Pipeline"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 dark:bg-slate-950/60 dark:border-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      {statusMessage || "Ready"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 dark:bg-slate-950/60 dark:border-slate-700">
                      <span className="font-mono">progress</span> {progress.pct}%
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 dark:bg-slate-950/60 dark:border-slate-700">
                      <span className="font-mono">elapsed</span> {elapsedLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePasteUrl}
                      className="text-[11px] text-slate-700 hover:text-slate-900 underline underline-offset-4 dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      Paste URL
                    </button>
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
                </div>

                {recentUrls.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Recent:
                    </span>
                    {recentUrls.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setUrlInput(u);
                          setJob(null);
                          setRawIngestResponse(null);
                          setPollingState(null);
                          setStatusMessage("Loaded recent URL — choose Quick SEO or Full Pipeline");
                          setError(null);
                          setPipelineRunId(null);
                          setPipelineSnapshot(null);
                        }}
                        className="max-w-[260px] truncate rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] text-slate-700 hover:bg-white shadow-sm dark:bg-slate-950/60 dark:border-slate-700"
                        title={u}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inline “what happens” strip */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 px-3 py-2 shadow-sm dark:bg-slate-950/80 dark:border-slate-700/70">
                <span className="text-cyan-700 font-semibold uppercase tracking-[0.16em] dark:text-cyan-200">Quick</span>
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-mono">extract → seo</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 px-3 py-2 shadow-sm dark:bg-slate-950/80 dark:border-slate-700/70">
                <span className="text-slate-700 font-semibold uppercase tracking-[0.16em] dark:text-slate-200">Full</span>
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-mono">extract → seo → audit → import → monitor → price</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: live telemetry */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="rounded-2xl bg-white/95 border border-slate-200 shadow-sm p-4 dark:bg-slate-950/70 dark:border-slate-700/70">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Live telemetry
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!pipelineRunId) return;
                      try {
                        const snap = await fetchPipelineSnapshot(pipelineRunId);
                        setPipelineSnapshot(snap);
                        setLastUpdatedAt(Date.now());
                      } catch (e: any) {
                        setError(String(e?.message || e));
                      }
                    }}
                    disabled={!pipelineRunId}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline underline-offset-4 disabled:opacity-40 dark:text-slate-300 dark:hover:text-white"
                  >
                    Refresh now
                  </button>

                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-cyan-500"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    Auto-refresh
                  </label>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-950/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300">Progress</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {progress.done}/{progress.total} • {progress.pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {progress.active ? (
                      <>
                        Now: <span className="font-medium text-slate-700 dark:text-slate-200">{progress.active}</span>
                      </>
                    ) : (
                      "Idle"
                    )}
                    <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                    Last update: <span className="font-mono">{lastUpdatedLabel}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:bg-slate-950/60 dark:border-slate-700">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Run status</p>
                    <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                      {pipelineSnapshot?.run?.status || (pipelineRunId ? "loading…" : "—")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:bg-slate-950/60 dark:border-slate-700">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Elapsed</p>
                    <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{elapsedLabel}</p>
                  </div>
                </div>

                {moduleRuntimeBadges.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:bg-slate-950/60 dark:border-slate-700">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-2">Module runtimes</p>
                    <div className="flex flex-wrap gap-2">
                      {moduleRuntimeBadges.map((m) => {
                        const tone =
                          m.status === "succeeded"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-100"
                            : m.status === "running"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100"
                            : m.status === "failed"
                            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-100"
                            : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300";
                        return (
                          <span
                            key={m.key}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${tone}`}
                            title={
                              m.output_ref ? `output_ref: ${m.output_ref}` : m.error ? JSON.stringify(m.error) : m.status
                            }
                          >
                            <span className="font-medium">{m.key}</span>
                            <span className="text-[10px] opacity-80">{m.duration}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-950/60 dark:border-slate-700 dark:text-slate-400">
                    Run a URL to see live module timings and artifacts.
                  </div>
                )}
              </div>
            </div>

            {/* Real-time pipeline list (compact) */}
            <div className="rounded-2xl bg-white/95 border border-slate-200 px-4 py-3 shadow-sm dark:bg-slate-950/70 dark:border-slate-700/70">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Real-time pipeline
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {loading || generating ? "Running…" : pipelineRunId ? "Ready" : "Idle"}
                </span>
              </div>

              <ol className="mt-3 space-y-2 text-xs">
                {statusPills.map((pill) => {
                  const isDone = pill.state === "done";
                  const isActive = pill.state === "active";
                  return (
                    <li
                      key={pill.key}
                      className="flex items-center justify-between rounded-xl border px-3 py-2 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            isDone
                              ? "bg-emerald-400"
                              : isActive
                              ? "bg-amber-400 animate-pulse"
                              : "bg-slate-400 dark:bg-slate-500",
                          ].join(" ")}
                        />
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-100">{pill.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{pill.hint}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-3 text-sm shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
            {error}
          </div>
        )}

        {/* RESULTS */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main results */}
          <div className="lg:col-span-8 space-y-4">
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
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 border border-slate-900 shadow-sm hover:bg-slate-800 disabled:opacity-40 dark:bg-white/5 dark:border-white/25"
                  >
                    {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy description"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 font-semibold border border-slate-900 shadow-sm hover:-translate-y-[1px] transition disabled:opacity-40"
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

          {/* Side column */}
          <div className="lg:col-span-4 space-y-4">
            {/* SEO structure */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3 dark:bg-slate-900/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">SEO structure</h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Driven by custom instructions</span>
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
                <p className="text-slate-500 text-xs dark:text-slate-400">No features captured yet. Run Quick SEO to generate.</p>
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
