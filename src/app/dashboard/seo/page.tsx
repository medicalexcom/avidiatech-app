"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /dashboard/seo
 *
 * Notes:
 * - This page runs pipeline runs and then refreshes ingestion data.
 * - Canonical naming for SEO results is now Describe-style:
 *   - seo
 *   - descriptionHtml
 *   - features
 *
 * IMPORTANT (2025-12-28):
 * - Do NOT report "completed" if the pipeline run status is "failed".
 * - Ingestion polling must treat terminal errors as terminal (server returns 409).
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

function extractEngineErrorMessage(payload: any): string {
  const e = payload?.error;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    return String(e.message || e.detail || e.code || "ingest_engine_error");
  }
  return String(payload?.last_error || "ingest_engine_error");
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

  const [isPreviewResult] = useState(false);

  // Pipeline state
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(pipelineRunIdParam);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);

  const [mode, setMode] = useState<Mode>("quick");

  useEffect(() => {
    if (pipelineRunIdParam) setPipelineRunId(pipelineRunIdParam);
  }, [pipelineRunIdParam]);

  useEffect(() => {
    if (urlParam && urlParam.length > 0) {
      setMode("full");
      setUrlInput(urlParam);
    } else if (ingestionIdParam) {
      setMode("quick");
    }
  }, [urlParam, ingestionIdParam]);

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

  async function startPipelineRun(forIngestionId: string, m: Mode) {
    const steps = m === "quick" ? QUICK_STEPS : FULL_STEPS;

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
    router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(forIngestionId)}&pipelineRunId=${encodeURIComponent(runId)}`);

    setStatusMessage("Pipeline running");
    return runId;
  }

  async function run(modeToRun: Mode) {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);

    try {
      let idToUse: string | null = null;
      const trimmed = (urlInput || "").trim();
      const isSameAsInitial = Boolean(urlParam && trimmed && urlParam === trimmed);

      if (ingestionId && modeToRun === "quick") {
        idToUse = ingestionId;
      } else if (modeToRun === "full") {
        if (trimmed && isSameAsInitial && ingestionId) {
          idToUse = ingestionId;
        } else {
          setJob(null);
          setRawIngestResponse(null);
          setPollingState(null);
          setStatusMessage(null);

          idToUse = await createIngestion(trimmed);
          router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(idToUse)}`);
        }
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      await fetchIngestionData(idToUse);

      const runId = await startPipelineRun(idToUse, modeToRun);

      const snap = await pollPipeline(runId, modeToRun === "quick" ? 180_000 : 300_000, 2000);

      // Always refresh ingestion after pipeline stops (success or failure)
      await fetchIngestionData(idToUse);

      const finalStatus = snap?.run?.status;

      if (finalStatus === "succeeded") {
        setStatusMessage(modeToRun === "quick" ? "Quick SEO succeeded" : "Full pipeline succeeded");
      } else if (finalStatus === "failed") {
        setStatusMessage(null);
        throw new Error("Pipeline failed (see pipeline telemetry + module output).");
      } else {
        // shouldn't happen but avoid lying to the user
        setStatusMessage(null);
        throw new Error(`Pipeline ended in unexpected status: ${String(finalStatus)}`);
      }
    } catch (e: any) {
      if (e?.payload) {
        console.warn("Terminal ingest error payload:", e.payload);
      }
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
    return (
      (jobData as any)?.seo ??
      (jobData as any)?.seoPayload ??
      (jobData as any)?.seo_payload ??
      null
    );
  }, [jobData]);

  const rawDescriptionHtml =
    (jobData as any)?.descriptionHtml ??
    (jobData as any)?.description_html ??
    (jobData as any)?._debug?.description_html ??
    null;

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
    const mods = pipelineSnapshot?.modules ?? [];
    return mods.map((m) => {
      const start = safeDateMs(m.started_at ?? null);
      const end = safeDateMs(m.finished_at ?? null);
      const duration = start != null && end != null ? clamp(end - start, 0, 24 * 60 * 60 * 1000) : null;
      return { ...m, duration_ms: duration };
    });
  }, [pipelineSnapshot]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-white p-4 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">AvidiaSEO</h1>
              <p className="text-sm text-slate-500">
                Canonical naming aligned with Describe: <code>seo</code>, <code>descriptionHtml</code>, <code>features</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className={`rounded px-3 py-2 text-sm border ${mode === "quick" ? "bg-slate-900 text-white" : "bg-white"}`}
                onClick={() => setMode("quick")}
                disabled={generating}
              >
                Quick SEO
              </button>
              <button
                className={`rounded px-3 py-2 text-sm border ${mode === "full" ? "bg-slate-900 text-white" : "bg-white"}`}
                onClick={() => setMode("full")}
                disabled={generating}
              >
                Full Pipeline
              </button>
            </div>
          </div>

          {mode === "full" && (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-sm font-medium">Source URL</label>
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="https://example.com/product/..."
                disabled={generating}
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => run(mode)}
              disabled={generating || (mode === "full" && !urlInput.trim())}
            >
              {generating ? "Running..." : mode === "quick" ? "Run Quick SEO" : "Run Full Pipeline"}
            </button>

            {ingestionId && (
              <a
                className="text-sm underline text-slate-600"
                href={`/dashboard/seo?ingestionId=${encodeURIComponent(ingestionId)}`}
              >
                Refresh
              </a>
            )}
          </div>

          {(statusMessage || pollingState) && (
            <div className="mt-3 text-sm text-slate-600">
              {statusMessage ? <div>Status: {statusMessage}</div> : null}
              {pollingState ? <div>Polling: {pollingState}</div> : null}
            </div>
          )}

          {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}

          {rawIngestResponse && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-600">Ingest debug</summary>
              <pre className="mt-2 max-h-[260px] overflow-auto rounded border bg-black p-3 text-[12px] text-white">
                {JSON.stringify(rawIngestResponse, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border bg-white p-4 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Description HTML</h2>
              <div className="flex items-center gap-2">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                  placeholder="Search in HTML..."
                />
                <button
                  className="rounded border px-2 py-1 text-sm"
                  onClick={handleCopyDescription}
                  disabled={!descriptionHtml}
                >
                  {copyState === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-3 rounded border p-3">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 dark:bg-slate-950">
            <h2 className="text-sm font-semibold">SEO</h2>
            <div className="mt-2 text-sm">
              <div><span className="font-medium">H1:</span> {seo?.h1 ?? "—"}</div>
              <div><span className="font-medium">Title:</span> {seo?.pageTitle ?? seo?.title ?? "—"}</div>
              <div><span className="font-medium">Meta:</span> {seo?.metaDescription ?? seo?.meta_description ?? "—"}</div>
              <div><span className="font-medium">Short:</span> {seo?.shortDescription ?? seo?.seoShortDescription ?? seo?.seo_short_description ?? "—"}</div>
            </div>

            {Array.isArray(features) && features.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Features</h3>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {features.map((f, i) => (
                    <li key={i}>{String(f)}</li>
                  ))}
                </ul>
              </>
            )}

            {parkedExtras.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-600">Extra SEO keys</summary>
                <pre className="mt-2 max-h-[260px] overflow-auto rounded border bg-black p-3 text-[12px] text-white">
                  {JSON.stringify(Object.fromEntries(parkedExtras), null, 2)}
                </pre>
              </details>
            )}

            <details className="mt-4">
              <summary
                className="cursor-pointer text-sm text-slate-600"
                onClick={() => setShowRawExtras((v) => !v)}
              >
                Raw ingestion JSON
              </summary>
              <pre className="mt-2 max-h-[360px] overflow-auto rounded border bg-black p-3 text-[12px] text-white">
                {JSON.stringify(jobData ?? null, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        {pipelineSnapshot && (
          <div className="rounded-lg border bg-white p-4 dark:bg-slate-950">
            <h2 className="text-sm font-semibold">Pipeline telemetry</h2>
            <div className="mt-2 text-sm text-slate-600">
              Run: {pipelineSnapshot?.run?.id ?? pipelineRunId ?? "—"} • Status:{" "}
              {pipelineSnapshot?.run?.status ?? "—"}
            </div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Module</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleDurations.map((m) => (
                    <tr key={`${m.module_name}-${m.module_index}`} className="border-b">
                      <td className="py-2 pr-3">{m.module_name} (#{m.module_index})</td>
                      <td className="py-2 pr-3">{m.status}</td>
                      <td className="py-2 pr-3">
                        {m.duration_ms != null ? formatDuration(m.duration_ms) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {pipelineRunId && (
                          <a
                            className="underline"
                            href={`/api/v1/pipeline/run/${encodeURIComponent(
                              pipelineRunId
                            )}/output/${encodeURIComponent(String(m.module_index))}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View output
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!moduleDurations.length && (
                    <tr>
                      <td className="py-2" colSpan={4}>
                        No module telemetry available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isPreviewResult && <div className="mt-2 text-xs text-amber-700">Preview-only mode.</div>}
          </div>
        )}

        {loading && <div className="text-sm text-slate-600">Loading ingestion…</div>}
      </div>
    </div>
  );
}
