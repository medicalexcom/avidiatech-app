// src/app/dashboard/seo/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JsonViewer from "@/components/JsonViewer";
import TabsShell from "@/components/TabsShell";
import { useIngestRow } from "@/hooks/useIngestRow";

/**
 * AvidiaSEO page (client)
 *
 * Layout goals (match Extract + Describe):
 * - Premium background: glows + wash + subtle grid
 * - Inputs immediately accessible under hero heading
 * - Results on the left, diagnostics/JSON on the right
 * - No overflow-hidden clipping (so corner glows actually show)
 * - No forced inner Y-scroll “viewer traps” (page scroll only)
 *
 * Modes:
 * - Quick SEO: ingest → pipeline(extract+seo)
 * - Full Pipeline: ingest → pipeline(extract+seo+audit+import+monitor+price)
 */

export const dynamic = "force-dynamic";

type AnyObj = Record<string, any>;
type Mode = "quick" | "full";

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

const QUICK_STEPS = ["extract", "seo"] as const;
const FULL_STEPS = ["extract", "seo", "audit", "import", "monitor", "price"] as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

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

function stripScripts(html: string) {
  if (!html) return "";
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

export default function SeoPage() {
  const router = useRouter();
  const params = useSearchParams();

  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;
  const pipelineRunIdParam = params?.get("pipelineRunId") || null;

  // job state (same concept as Extract)
  const [jobId, setJobId] = useState<string | null>(ingestionIdParam);
  const [jobUrl, setJobUrl] = useState<string | null>(urlParam);

  // DB row polling (same hook as Extract)
  const { row, loading: rowLoading, error: rowError } = useIngestRow(jobId, 1500);

  // preview state when synchronous GET returns immediately (Extract-style)
  const [preview, setPreview] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ui state
  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [modeRunning, setModeRunning] = useState<Mode>("quick");
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const [nowTick, setNowTick] = useState(() => Date.now());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [localRunStartMs, setLocalRunStartMs] = useState<number | null>(null);

  // steady clock for “elapsed”
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function extractRowData(source: any | null | undefined) {
    if (!source) return null;
    const base = source.data ?? source;
    return base;
  }

  // prefer preview when available; fall back to DB row
  const jobData = useMemo(() => {
    if (preview) return extractRowData(preview);
    if (row) return extractRowData(row);
    return null;
  }, [preview, row]);

  const normalizedPayload = useMemo(() => {
    const base = jobData?.data ?? jobData;
    return base?.normalized_payload ?? base?.normalizedPayload ?? base?.normalized ?? null;
  }, [jobData]);

  const seoPayload =
    jobData?.seo_payload ??
    (jobData as any)?.seoPayload ??
    (jobData as any)?.data?.seo_payload ??
    null;

  const rawDescriptionHtml =
    jobData?.description_html ??
    (jobData as any)?.descriptionHtml ??
    (jobData as any)?.seo_payload?.description_html ??
    (jobData as any)?.data?.description_html ??
    null;

  const descriptionHtml = useMemo(() => {
    if (typeof rawDescriptionHtml !== "string") return null;
    const cleaned = stripScripts(rawDescriptionHtml).trim();
    return cleaned.length ? cleaned : null;
  }, [rawDescriptionHtml]);

  const features = useMemo(() => {
    if (Array.isArray(jobData?.features)) return jobData.features;
    if (Array.isArray((jobData as any)?.seo_payload?.features)) return (jobData as any).seo_payload.features;
    return null;
  }, [jobData]);

  const hasSeo = Boolean(seoPayload || descriptionHtml || (Array.isArray(features) && features.length));

  // status dot like Extract
  const statusDot =
    rowLoading || previewLoading || generating
      ? "bg-amber-400 animate-pulse"
      : hasSeo
      ? "bg-emerald-500 dark:bg-emerald-400"
      : jobId
      ? "bg-sky-400"
      : "bg-slate-400";

  const statusText =
    rowLoading || previewLoading
      ? "Fetching ingestion preview…"
      : generating
      ? "Running pipeline…"
      : hasSeo
      ? "SEO ready"
      : jobId
      ? "Ingestion ready (run SEO)"
      : "Awaiting first URL";

  // --------- PREVIEW GET (Extract-style) ----------
  useEffect(() => {
    if (!jobId || !jobUrl) return;

    let mounted = true;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const target = `/api/v1/ingest/${encodeURIComponent(jobId)}?url=${encodeURIComponent(jobUrl)}`;
        const res = await fetch(target, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        const text = await res.text().catch(() => "");
        if (!mounted) return;

        if (!res.ok) {
          let message = `preview fetch failed (${res.status})`;
          try {
            const j = JSON.parse(text || "{}");
            message = j?.error?.message || j?.error || message;
          } catch {
            // keep default
          }
          setPreviewError(message);
          setPreviewLoading(false);
          return;
        }

        try {
          const j = JSON.parse(text || "{}");
          setPreview(j);
        } catch {
          setPreviewError("Preview returned non-JSON response");
        }
      } catch (err: any) {
        if (!mounted) return;
        setPreviewError(String(err?.message || err));
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [jobId, jobUrl]);

  // --------- PIPELINE FETCH ----------
  const fetchPipelineSnapshot = useCallback(async (runId: string) => {
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`;
      throw new Error(msg);
    }
    return json as PipelineSnapshot;
  }, []);

  // initial load of pipeline snapshot if url includes pipelineRunId
  useEffect(() => {
    if (!pipelineRunId) return;
    let cancelled = false;

    (async () => {
      try {
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

  // auto-refresh pipeline while running
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
        if (status === "succeeded" || status === "failed") clearInterval(tick);
      } catch {
        // avoid spamming; keep last state
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [autoRefresh, fetchPipelineSnapshot, pipelineRunId]);

  async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2000) {
    const start = Date.now();
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

  // --------- INGEST CREATE ----------
  async function createIngestion(url: string) {
    const cleaned = (url || "").trim();
    if (!cleaned) throw new Error("Please enter a URL");

    setError(null);
    setStatusMessage("Submitting ingestion…");

    const res = await fetch("/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: cleaned,
        persist: true,
        options: { includeSeo: true },
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Ingest failed: ${res.status}`);
    }

    const possibleId =
      json?.ingestionId ?? json?.id ?? json?.data?.id ?? json?.data?.ingestionId ?? null;

    if (!possibleId) {
      // some engines return jobId only — still usable as “jobId” for preview GET
      const job = json?.jobId ?? json?.job?.id ?? null;
      if (!job) throw new Error("Ingest did not return ingestionId or jobId.");
      return String(job);
    }

    return String(possibleId);
  }

  async function startPipelineRun(ingestionIdToUse: string, mode: Mode) {
    setModeRunning(mode);
    setGenerating(true);
    setError(null);

    const steps = mode === "quick" ? [...QUICK_STEPS] : [...FULL_STEPS];
    setStatusMessage(mode === "quick" ? "Starting Quick SEO…" : "Starting Full pipeline…");

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
      `/dashboard/seo?ingestionId=${encodeURIComponent(ingestionIdToUse)}&url=${encodeURIComponent(
        (jobUrl || urlInput || "").trim()
      )}&pipelineRunId=${encodeURIComponent(newRunId)}`
    );

    return newRunId;
  }

  async function runMode(mode: Mode) {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setStatusMessage(null);

    try {
      const trimmed = (urlInput || "").trim();
      if (!trimmed) throw new Error("Please enter a URL");

      let id = jobId;

      // new URL = new ingestion (like Extract behavior)
      if (!id || (jobUrl && trimmed !== jobUrl)) {
        setPreview(null);
        setPreviewError(null);

        const newId = await createIngestion(trimmed);
        id = newId;

        setJobId(newId);
        setJobUrl(trimmed);

        router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(newId)}&url=${encodeURIComponent(trimmed)}`);
      }

      if (!id) throw new Error("No ingestionId available.");

      const runId = await startPipelineRun(id, mode);
      await pollPipeline(runId, mode === "quick" ? 180_000 : 300_000, 2000);

      setStatusMessage(mode === "quick" ? "Quick SEO completed" : "Full pipeline completed");
    } catch (e: any) {
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setGenerating(false);
    }
  }

  // --------- VIEW HELPERS ----------
  const highlightedDescription = useMemo(() => {
    if (!descriptionHtml) return "<em>No description generated yet</em>";
    if (!searchTerm) return descriptionHtml;

    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return descriptionHtml.replace(regex, '<mark class="bg-amber-200 text-gray-900 px-1 rounded-sm">$1</mark>');
    } catch {
      return descriptionHtml;
    }
  }, [descriptionHtml, searchTerm]);

  const handleCopyDescription = async () => {
    if (!descriptionHtml) return;
    try {
      await navigator.clipboard.writeText(descriptionHtml);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1200);
    }
  };

  const handleDownloadDescription = () => {
    if (!descriptionHtml) return;
    const blob = new Blob([descriptionHtml], { type: "text/html" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `avidia-seo-description-${jobId || "preview"}.html`;
    a.click();
    URL.revokeObjectURL(u);
  };

  // progress + elapsed (simple + reliable)
  const moduleMap = useMemo(() => {
    const map = new Map<string, PipelineModule>();
    for (const m of pipelineSnapshot?.modules ?? []) map.set(m.module_name, m);
    return map;
  }, [pipelineSnapshot]);

  const stepsForMode = modeRunning === "full" ? [...FULL_STEPS] : [...QUICK_STEPS];

  const pills = useMemo(() => {
    const out: Array<{ key: string; label: string; state: "idle" | "active" | "done"; hint: string }> = [];

    out.push({
      key: "ingest",
      label: "Scraping & Normalizing",
      state: rowLoading || previewLoading ? "active" : jobId ? "done" : "idle",
      hint: row?.status || (jobId ? "ready" : "waiting"),
    });

    for (const step of stepsForMode) {
      const m = moduleMap.get(step);
      const state =
        m?.status === "running"
          ? "active"
          : m?.status === "succeeded"
          ? "done"
          : step === "seo" && hasSeo
          ? "done"
          : "idle";
      out.push({
        key: step,
        label: step === "seo" ? "AvidiaSEO Generation" : `${step[0].toUpperCase()}${step.slice(1)} module`,
        state,
        hint: m?.status ? `module: ${m.status}` : step === "seo" && hasSeo ? "SEO saved" : "ready",
      });
    }

    out.push({
      key: "preview",
      label: "Human-ready Preview",
      state: hasSeo ? "done" : "idle",
      hint: hasSeo ? "Rendered" : "awaiting generation",
    });

    return out;
  }, [hasSeo, jobId, moduleMap, previewLoading, row?.status, rowLoading, stepsForMode]);

  const progress = useMemo(() => {
    const total = pills.length || 1;
    const done = pills.filter((p) => p.state === "done").length;
    const active = pills.find((p) => p.state === "active")?.label ?? null;
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    return { total, done, pct, active };
  }, [pills]);

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

  const jsonViewerData = useMemo(() => {
    // prefer normalized payload if present; else show whole row
    if (normalizedPayload) return normalizedPayload;
    if (preview) return preview;
    if (row) return row;
    return {};
  }, [normalizedPayload, preview, row]);

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* BACKGROUND: match Extract/Describe */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/18" />
        <div className="absolute -bottom-44 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/14" />
        <div className="absolute top-24 right-10 h-56 w-56 rounded-full bg-amber-300/12 blur-3xl dark:bg-amber-500/10" />

        {/* wash (YES — this is the same wash layer your working pages use) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HERO */}
        <section className="rounded-[28px] bg-gradient-to-r from-cyan-200/60 via-sky-200/35 to-emerald-200/60 p-[1px] shadow-2xl shadow-slate-200/70 dark:from-cyan-500/22 dark:via-sky-500/14 dark:to-emerald-500/22 dark:shadow-slate-950/70">
          <div className="rounded-[27px] border border-white/50 bg-white/75 p-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/52 lg:p-5">
            {/* top strip */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-800 shadow-sm dark:border-cyan-500/45 dark:bg-slate-950/55 dark:text-cyan-100">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-100 dark:bg-slate-900">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  </span>
                  AvidiaTech • AvidiaSEO
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/55 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Ingest + pipeline • Traceable
                </span>

                {row?.status && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/55 dark:text-slate-300">
                    Status:
                    <span className="font-mono text-[10px] uppercase text-cyan-700 dark:text-cyan-200">
                      {row.status}
                    </span>
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/55 dark:text-slate-300">
                <span className={cx("h-1.5 w-1.5 rounded-full", statusDot)} />
                <span>{statusMessage || statusText}</span>
              </div>
            </div>

            {/* hero body */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)] lg:items-start">
              {/* LEFT */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                    Turn any manufacturer URL into a{" "}
                    <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-sky-400 dark:to-emerald-300">
                      production-ready SEO page
                    </span>
                    .
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    Paste a product URL, choose Quick SEO or Full Pipeline, and get HTML + structured SEO fields that stay
                    consistent with your custom instruction profile.
                  </p>
                </div>

                {/* Input card (primary action) */}
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-xl shadow-slate-200/60 dark:border-slate-700/70 dark:bg-slate-950/60 dark:shadow-slate-950/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        SEO launcher
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Submit a manufacturer URL; AvidiaSEO handles the rest.
                      </p>
                    </div>

                    {jobId && (
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Ingestion</p>
                        <p className="font-mono text-[10px] text-cyan-700 dark:text-cyan-200">{jobId.slice(0, 10)}…</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr),minmax(0,310px)]">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        Manufacturer product URL
                      </label>
                      <input
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setError(null);
                          setStatusMessage(null);
                          // do not wipe jobId until they actually run
                        }}
                        placeholder="https://manufacturer.com/product..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                        Tip: changing the URL creates a new ingestion when you run.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        Run mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => runMode("quick")}
                          disabled={generating}
                          className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none"
                          title="Runs extract + seo"
                        >
                          {generating && modeRunning === "quick" ? "Running…" : "Quick SEO"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runMode("full")}
                          disabled={generating}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:shadow-none dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-white"
                          title="Runs extract + seo + audit + import + monitor + price"
                        >
                          {generating && modeRunning === "full" ? "Running…" : "Full Pipeline"}
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900/50">
                          <span className={cx("h-1.5 w-1.5 rounded-full", statusDot)} />
                          {generating ? "Pipeline running…" : "Idle"}
                        </span>
                        <span className="font-mono">
                          progress {progress.pct}% • elapsed {elapsedLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT guidance */}
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-[11px] text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-100">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Quick start
                  </p>

                  <div className="space-y-2">
                    {[
                      { n: "1", tone: "border-cyan-400/55 text-cyan-700 dark:text-cyan-200", label: "Paste a URL", body: "Use a manufacturer product page (not a category page)." },
                      { n: "2", tone: "border-amber-400/55 text-amber-700 dark:text-amber-200", label: "Run Quick SEO", body: "Extract + SEO generation in one run." },
                      { n: "3", tone: "border-emerald-400/55 text-emerald-700 dark:text-emerald-200", label: "Ship downstream", body: "Reuse ingestionId in Import, Monitor, and exports." },
                    ].map((s) => (
                      <div
                        key={s.n}
                        className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30"
                      >
                        <div
                          className={cx(
                            "mt-[1px] flex h-6 w-6 items-center justify-center rounded-lg border bg-white dark:bg-slate-950",
                            s.tone
                          )}
                        >
                          <span className="text-[12px] font-semibold">{s.n}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{s.label}</div>
                          <div className="mt-0.5 text-slate-600 dark:text-slate-300">{s.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-white/80 px-4 py-4 text-[11px] text-slate-700 shadow-sm dark:border-cyan-500/30 dark:bg-slate-950/50 dark:text-slate-100">
                  <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                    What you get
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Structured HTML description (final page-ready)</li>
                    <li>SEO fields (H1, title, meta, short desc)</li>
                    <li>Traceable module runs + artifacts</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-4 text-[11px] text-slate-700 shadow-sm dark:border-emerald-500/30 dark:bg-slate-950/50 dark:text-slate-100">
                  <p className="mb-1 font-semibold text-emerald-700 dark:text-emerald-300">
                    Live telemetry
                  </p>
                  <p className="leading-relaxed">
                    You’ll see module status, runtimes, and the pipeline run id — same “debuggable” experience as Extract.
                  </p>
                </div>
              </div>
            </div>

            {/* bottom mini value props */}
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {[
                { n: "1", title: "Instructioned output", body: "Matches your custom GPT rules: structure, disclaimers, meta caps." },
                { n: "2", title: "Traceable runs", body: "Every pipeline creates runs + module artifacts for auditability." },
                { n: "3", title: "Downstream-ready", body: "Reuse ingestionId in Import, Monitor, Price, feeds, or exports." },
              ].map((x) => (
                <div
                  key={x.n}
                  className="inline-flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-[11px] text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-50"
                >
                  <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-cyan-400/70 bg-cyan-500/10 text-[12px] text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                    {x.n}
                  </div>
                  <div>
                    <p className="font-semibold">{x.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{x.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
            {error}
          </div>
        )}

        {/* WORKSPACE: Left = preview, Right = telemetry + SEO + JSON */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)]">
          {/* LEFT */}
          <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-slate-950/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  SEO preview canvas
                </h2>
                <p className="mt-1 max-w-xl text-[11px] text-slate-600 dark:text-slate-400">
                  This is the final HTML output — rendered the way it’ll appear on your product page. No inner scroll traps;
                  the page scrolls naturally.
                </p>
              </div>

              {jobId && (
                <button
                  onClick={() => router.push(`/dashboard/extract?ingestionId=${encodeURIComponent(jobId)}&url=${encodeURIComponent(jobUrl || "")}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-lg shadow-cyan-500/30 transition-transform hover:-translate-y-[1px] hover:bg-cyan-400 dark:text-slate-950"
                  title="Open this ingestion in Extract"
                >
                  <span>Open in Extract</span>
                  <span className="text-[13px]">↗</span>
                </button>
              )}
            </div>

            {/* Status strip */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                <span className={cx("h-1.5 w-1.5 rounded-full", statusDot)} />
                <span>{statusMessage || statusText}</span>
              </div>

              {rowError && (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/70 dark:text-rose-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                  DB error: {String(rowError)}
                </span>
              )}

              {previewError && !previewLoading && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Preview: {previewError}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDescription}
                  disabled={!descriptionHtml}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-50 shadow-sm hover:bg-slate-800 disabled:opacity-40 dark:bg-white/5 dark:border dark:border-white/20"
                >
                  {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy HTML"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDescription}
                  disabled={!descriptionHtml}
                  className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-amber-300 disabled:opacity-40"
                >
                  Download HTML
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in description…"
                  className="w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Live highlight</span>
              </div>
            </div>

            {/* Rendered HTML */}
            <div className="mt-1 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
              <div className="border-b border-slate-200 px-4 py-3 text-[11px] dark:border-slate-800">
                <p className="uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Rendered description</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Mirrors your instruction profile — headings, lists, disclaimers, manuals.
                </p>
              </div>

              <div className="prose prose-slate max-w-none px-6 py-5 text-sm dark:prose-invert">
                {descriptionHtml ? (
                  <article
                    className="prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h3:mt-4 prose-ul:list-disc prose-li:marker:text-slate-400"
                    dangerouslySetInnerHTML={{ __html: highlightedDescription }}
                  />
                ) : (
                  <div className="text-slate-500 text-sm italic dark:text-slate-400">
                    No SEO description yet. Paste a URL above and run Quick SEO or Full Pipeline.
                  </div>
                )}
              </div>
            </div>

            {/* Optional: raw row tabs for debugging, like Extract */}
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Ingest row &amp; raw views</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Tabs expose different slices of the same ingest row (normalized, raw HTML, logs, etc).
              </p>
              <div className="mt-2">
                <TabsShell job={row} loading={rowLoading} error={rowError} noDataMessage="Run a URL to populate the ingestion row" />
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className="flex flex-col gap-4">
            {/* Telemetry */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-slate-950/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live telemetry</h2>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Pipeline status, run id, module health, and freshness.
                  </p>
                </div>

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

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">Progress</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {progress.done}/{progress.total} • {progress.pct}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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

              <div className="mt-3 grid grid-cols-2 gap-2">
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

              <div className="mt-3">
                <ol className="space-y-2 text-xs">
                  {pills.map((pill) => {
                    const isDone = pill.state === "done";
                    const isActive = pill.state === "active";
                    return (
                      <li
                        key={pill.key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/40"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cx(
                              "h-2 w-2 rounded-full",
                              isDone
                                ? "bg-emerald-400"
                                : isActive
                                ? "bg-amber-400 animate-pulse"
                                : "bg-slate-400 dark:bg-slate-500"
                            )}
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

            {/* SEO structure */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-slate-950/80">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">SEO structure</h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Core SEO fields extracted from SEO output.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  <span className={cx("h-1.5 w-1.5 rounded-full", hasSeo ? "bg-emerald-400" : "bg-slate-400")} />
                  {hasSeo ? "ready" : "pending"}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">H1</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                    {seoPayload?.h1 ?? seoPayload?.name_best ?? "Not yet generated"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Page title</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                    {seoPayload?.pageTitle ?? seoPayload?.title ?? "Not yet generated"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Meta description</p>
                  <p className="mt-1 leading-relaxed text-slate-800 dark:text-slate-100">
                    {seoPayload?.metaDescription ?? seoPayload?.meta_description ?? "Not yet generated"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Short description</p>
                  <p className="mt-1 text-slate-800 dark:text-slate-100">
                    {seoPayload?.seoShortDescription ?? seoPayload?.seo_short_description ?? "Not yet generated"}
                  </p>
                </div>

                {Array.isArray(features) && features.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="text-[11px] uppercase text-slate-500 dark:text-slate-400">Feature bullets</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-slate-800 dark:text-slate-100">
                      {features.slice(0, 10).map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                      {features.length > 10 && <li className="text-slate-400">…truncated</li>}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            {/* JSON viewer (no forced inner scroll, consistent with Extract) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-slate-950/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Normalized JSON viewer</h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Preferentially shows normalized payload; falls back to the raw ingest row.
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                  {jobId ? (
                    <>
                      Job:{" "}
                      <span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-200">{jobId.slice(0, 10)}…</span>
                    </>
                  ) : (
                    "No job yet"
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] dark:border-slate-800">
                  <span className="uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payload explorer</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-500">
                    {normalizedPayload ? "Normalized" : preview ? "Preview" : row ? "DB row" : "Awaiting"}
                  </span>
                </div>

                <div className="p-2">
                  <JsonViewer data={jsonViewerData} loading={!row && !!jobId && !preview} />
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
