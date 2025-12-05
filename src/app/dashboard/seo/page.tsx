"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * - Works with ?ingestionId=... OR ?url=...
 * - If ingest returns jobId (202), poll /api/v1/ingest/job/:jobId until ingestion row appears AND is completed.
 * - Then call /api/v1/seo with ingestionId. If persist denied (401), fall back to preview (persist:false).
 */

type AnyObj = Record<string, any>;

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ingestionIdParam = params?.get("ingestionId") || null;
  const urlParam = params?.get("url") || null;

  const ingestionId = ingestionIdParam;
  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [showRawExtras, setShowRawExtras] = useState(false);

  // Debug / polling state
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  // track whether current seo result is preview (not persisted)
  const [isPreviewResult, setIsPreviewResult] = useState(false);

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
          throw new Error(
            json?.error?.message ||
              json?.error ||
              `Ingest fetch failed: ${res.status}`
          );
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

  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    setStatusMessage("Loading ingestion");
    fetchIngestionData(ingestionId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchIngestionData, ingestionId]);

  async function generateFromIngestion(id: string, tryPersist = true) {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setIsPreviewResult(false);
    setStatusMessage("Generating AvidiaSEO");

    async function callSeo(persistFlag: boolean) {
      try {
        const res = await fetch("/api/v1/seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingestionId: id, persist: persistFlag }),
        });
        const json = await res.json().catch(() => null);
        return { status: res.status, ok: res.ok, json, rawStatus: res.status };
      } catch (err) {
        return { status: 0, ok: false, json: null, error: String(err) };
      }
    }

    try {
      if (tryPersist) {
        const first = await callSeo(true);
        if (first.ok) {
          setIsPreviewResult(false);
          const seoPayload =
            first.json?.seo_payload ?? first.json?.seoPayload ?? null;
          const descriptionHtml =
            first.json?.description_html ??
            first.json?.descriptionHtml ??
            null;
          const features = first.json?.features ?? null;
          if (seoPayload || descriptionHtml || features) {
            setJob((prev) => ({
              ...(prev || {}),
              seo_payload:
                seoPayload ?? (prev as AnyObj)?.seo_payload ?? null,
              description_html:
                descriptionHtml ??
                (prev as AnyObj)?.description_html ??
                null,
              features: features ?? (prev as AnyObj)?.features ?? null,
            }));
            setStatusMessage("SEO persisted to Supabase");
          }
          await fetchIngestionData(id);
          router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(id)}`);
          return;
        }

        const code = first.json?.error?.code ?? "";
        if (
          first.status === 401 ||
          code === "UNAUTHORIZED_TO_PERSIST" ||
          first.status === 403
        ) {
          const preview = await callSeo(false);
          if (preview.ok) {
            setIsPreviewResult(true);
            const previewBody = preview.json;
            const previewJob = {
              ...(job || {}),
              seo_payload:
                previewBody?.seoPayload ??
                previewBody?.seo_payload ??
                previewBody,
              description_html:
                previewBody?.descriptionHtml ??
                previewBody?.description_html ??
                previewBody?.descriptionHtml ??
                previewBody?.description_html,
              _debug: previewBody?._debug ?? null,
            };
            setJob(previewJob);
            setError(
              "Preview generated. Sign in to persist SEO for this ingestion."
            );
            setStatusMessage("Preview SEO ready");
            return;
          } else {
            setError(
              preview.json?.error?.message ??
                `Preview failed: ${preview.status}`
            );
            setStatusMessage(null);
            return;
          }
        }

        setError(
          first.json?.error?.message ??
            `SEO generation failed: ${first.status}`
        );
        setStatusMessage(null);
        return;
      }

      const result = await callSeo(false);
      if (result.ok) {
        setIsPreviewResult(true);
        const previewBody = result.json;
        const previewJob = {
          ...(job || {}),
          seo_payload:
            previewBody?.seoPayload ??
            previewBody?.seo_payload ??
            previewBody,
          description_html:
            previewBody?.descriptionHtml ??
            previewBody?.description_html ??
            previewBody,
        };
        setJob(previewJob);
        setStatusMessage("Preview SEO ready");
      } else {
        setError(
          result.json?.error?.message ??
            `SEO preview failed: ${result.status}`
        );
        setStatusMessage(null);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setGenerating(false);
    }
  }

  // Polling helper: polls /api/v1/ingest/job/:jobId until ingestion row is completed (normalized_payload or status completed)
  async function pollForIngestion(
    jobId: string,
    timeoutMs = 120_000,
    intervalMs = 3000
  ) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(
          `/api/v1/ingest/job/${encodeURIComponent(jobId)}`
        );
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
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    setPollingState("timeout");
    setStatusMessage(null);
    throw new Error("Ingestion did not complete within timeout");
  }

  // Safer ingestion + generate flow
  async function createIngestionThenGenerate(url: string) {
    if (generating) return;
    if (!url) {
      setError("Please enter a URL");
      return;
    }
    setGenerating(true);
    setError(null);
    setRawIngestResponse(null);
    setPollingState(null);
    setStatusMessage("Submitting ingestion");
    try {
      // 1) create ingestion (persist:true) and request SEO extraction
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
      setStatusMessage("Ingestion accepted; waiting for callback");

      if (!res.ok) {
        setError(
          json?.error?.message || json?.error || `Ingest failed: ${res.status}`
        );
        return;
      }

      // If ingest returned a synchronous ingestionId, use it
      const possibleIngestionId =
        json?.ingestionId ??
        json?.id ??
        json?.data?.id ??
        json?.data?.ingestionId ??
        null;

      if (possibleIngestionId) {
        router.push(
          `/dashboard/seo?ingestionId=${encodeURIComponent(
            possibleIngestionId
          )}`
        );
        // If the ingest returned completed payload immediately (status 200 and normalized_payload present), pollForIngestion will return quickly.
        if (json?.status === "accepted" || res.status === 202) {
          // if the engine accepted job, poll until normalized_payload exists
          const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
          try {
            const pollResult = await pollForIngestion(jobId, 120_000, 3000);
            const newIngestionId =
              pollResult?.ingestionId ?? possibleIngestionId;
            router.push(
              `/dashboard/seo?ingestionId=${encodeURIComponent(
                newIngestionId
              )}`
            );
            await generateFromIngestion(newIngestionId, true);
            return;
          } catch (e: any) {
            setError(String(e?.message || e));
            return;
          }
        } else {
          // otherwise call SEO directly
          await generateFromIngestion(possibleIngestionId, true);
          return;
        }
      }

      // Otherwise, if ingest returned a jobId (async), poll for ingestion completion
      const jobId = json?.jobId ?? json?.job?.id ?? null;
      if (!jobId) {
        setError(
          "Ingest did not return an ingestionId or jobId. See debug pane."
        );
        return;
      }

      let pollResult;
      try {
        pollResult = await pollForIngestion(jobId, 120_000, 3000);
      } catch (e: any) {
        setError(String(e?.message || e));
        return;
      }

      const newIngestionId =
        pollResult?.ingestionId ?? pollResult?.id ?? null;
      if (!newIngestionId) {
        setError("Polling returned no ingestionId. See debug pane.");
        return;
      }

      router.push(
        `/dashboard/seo?ingestionId=${encodeURIComponent(newIngestionId)}`
      );
      await generateFromIngestion(newIngestionId, true);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
      setPollingState(null);
    }
  }

  async function handleGenerateAndSave() {
    setError(null);

    // If we have an ingestionId AND the URL hasn't changed from the original,
    // treat this as "re-run SEO on existing ingestion."
    const isSameAsInitial = initialUrl && urlInput === initialUrl;

    if (ingestionId && isSameAsInitial) {
      await generateFromIngestion(ingestionId, true);
      return;
    }

    // Otherwise, always treat as a brand-new run:
    // clear previous data and kick off full ingest → poll → SEO cascade.
    setJob(null);
    setIsPreviewResult(false);
    setRawIngestResponse(null);
    setPollingState(null);
    setStatusMessage(null);

    await createIngestionThenGenerate(urlInput);
  }

  const jobData = useMemo(() => {
    if (!job) return null;
    // allow shapes: { ok, data }, { data }, plain row, or nested { data: { data } }
    if (job?.data?.data) return job.data.data;
    if (job?.data) return job.data;
    return job;
  }, [job]);

  const seoPayload = jobData?.seo_payload ?? jobData?.seoPayload ?? null;

  const rawDescriptionHtml =
    jobData?.description_html ??
    jobData?.descriptionHtml ??
    jobData?.seo_payload?.description_html ??
    jobData?._debug?.description_html ??
    null;
  const descriptionHtml =
    typeof rawDescriptionHtml === "string" &&
    rawDescriptionHtml.trim().length > 0
      ? rawDescriptionHtml
      : null;

  const features = useMemo(() => {
    if (Array.isArray(jobData?.features)) return jobData.features;
    if (Array.isArray(jobData?.seo_payload?.features))
      return jobData.seo_payload.features;
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
    "keywords",
    "slug",
    "name_best",
  ];

  const parkedExtras = useMemo(() => {
    if (!seoPayload || typeof seoPayload !== "object")
      return [] as [string, any][];
    return Object.entries(seoPayload).filter(
      ([key]) => !knownSeoKeys.includes(key)
    );
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

  const statusPills = useMemo(() => {
    return [
      {
        key: "scrape",
        label: "Scraping & Normalizing",
        state:
          loading || pollingState
            ? "active"
            : jobData?.status === "completed" || jobData?.normalized_payload
            ? "done"
            : "idle",
        hint: pollingState || jobData?.status || "waiting",
      },
      {
        key: "seo",
        label: "AvidiaSEO Generation",
        state: generating ? "active" : hasSeo ? "done" : "idle",
        hint: generating
          ? "Calling central GPT"
          : hasSeo
          ? "SEO saved"
          : "ready",
      },
      {
        key: "review",
        label: "Human-ready Preview",
        state: hasSeo ? "done" : "idle",
        hint: hasSeo ? "Rendered" : "awaiting generation",
      },
    ];
  }, [
    generating,
    hasSeo,
    jobData?.normalized_payload,
    jobData?.status,
    loading,
    pollingState,
  ]);

  const demoUrl = "https://www.apple.com/iphone-17/";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Hero + header (now includes 3-step rail + live pipeline status) */}
        <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(56,189,248,0.15)] p-5 lg:p-7">
          <div className="flex flex-col gap-6">
            {/* Top row: title + nav */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    AvidiaSEO • Beta
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/extract${
                          ingestionId
                            ? `?ingestionId=${encodeURIComponent(ingestionId)}`
                            : ""
                        }`
                      )
                    }
                    className="text-[11px] text-slate-300 hover:text-cyan-200 underline underline-offset-4"
                  >
                    ← Back to Extract
                  </button>
                  {ingestionId && (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
                      Ingestion {ingestionId.slice(0, 8)}…
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-semibold text-slate-50">
                    Turn any manufacturer URL into a human-ready SEO page
                  </h1>
                  <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                    Paste a product URL, and AvidiaSEO handles scraping, cleanup,
                    and compliant copy in one click. No prompts, no copy-paste
                    between tools.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 border border-slate-700/60">
                    ⚡ Zero-config: wired into your ingest engine
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 border border-slate-700/60">
                    🧩 Opinionated layout, custom GPT instructions
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 border border-slate-700/60">
                    🔒 Persist to Supabase or preview when signed out
                  </span>
                </div>
                {statusMessage && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-cyan-100 bg-slate-900/70 border border-cyan-500/30 rounded-full px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {statusMessage}
                  </div>
                )}
              </div>

              {/* Right cluster: 3-step rail + compact pipeline status */}
              <div className="w-full lg:w-[360px] xl:w-[400px] space-y-3">
                <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
                    3-step visual flow
                  </p>
                  <ol className="space-y-2 text-xs">
                    {statusPills.map((pill, index) => {
                      const isDone = pill.state === "done";
                      const isActive = pill.state === "active";
                      return (
                        <li
                          key={pill.key}
                          className="flex items-center gap-3 relative"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={[
                                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                                isDone
                                  ? "bg-emerald-400 text-slate-900 border-emerald-300"
                                  : isActive
                                  ? "bg-cyan-500 text-slate-900 border-cyan-300 animate-pulse"
                                  : "bg-slate-900 text-slate-400 border-slate-600",
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
                                    : "bg-slate-700",
                                ].join(" ")}
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-medium text-slate-100">
                              {pill.label}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {pill.hint}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Live pipeline status integrated here */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                      Live pipeline status
                    </p>
                    {loading && (
                      <span className="text-[11px] text-slate-400">
                        Loading…
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {statusPills.map((pill) => (
                      <div
                        key={pill.key}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[11px] ${
                          pill.state === "done"
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-100"
                            : pill.state === "active"
                            ? "bg-amber-950/60 border-amber-500/40 text-amber-100"
                            : "bg-slate-950/60 border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              pill.state === "done"
                                ? "bg-emerald-400"
                                : pill.state === "active"
                                ? "bg-amber-400 animate-pulse"
                                : "bg-slate-500"
                            }`}
                          />
                          <span className="font-medium">{pill.label}</span>
                        </div>
                        <span className="text-[10px]">{pill.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Small hint row under hero if needed */}
            <div className="text-[11px] text-slate-400">
              Paste a manufacturer URL below to see the full pipeline light up
              in real time.
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/60 text-rose-50 px-4 py-3 text-sm shadow-lg shadow-rose-900/40">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main work column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Primary action: URL + Generate (right under hero) */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 lg:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-50">
                    One-click AvidiaSEO
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Step 1 — paste the manufacturer URL. Step 2 — hit{" "}
                    <span className="font-semibold text-cyan-300">
                      Generate &amp; Save
                    </span>
                    . AvidiaSEO runs ingest → poll → GPT SEO in a single shot.
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

                      // User is preparing a new run: clear previous outputs
                      setJob(null);
                      setIsPreviewResult(false);
                      setRawIngestResponse(null);
                      setPollingState(null);
                      setStatusMessage(null);
                      setError(null);
                    }}
                    placeholder="https://manufacturer.com/product..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 text-sm"
                    type="url"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleGenerateAndSave();
                    }}
                    disabled={generating}
                    className="sm:w-48 w-full px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px]"
                  >
                    {generating ? "Generating…" : "Generate & Save"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    This always runs the full cascade for the current URL. If
                    the URL matches an existing ingestion, AvidiaSEO reuses it.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(demoUrl);
                      setJob(null);
                      setIsPreviewResult(false);
                      setRawIngestResponse(null);
                      setPollingState(null);
                      setStatusMessage("Demo URL loaded — hit Generate & Save");
                      setError(null);
                    }}
                    className="text-[11px] text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
                  >
                    Try a demo URL
                  </button>
                </div>
              </div>
            </div>

            {/* Premium HTML viewer */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl shadow-slate-950/70 p-6 border border-slate-700/80">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 mb-1">
                    Description window
                  </p>
                  <h3 className="text-2xl font-semibold mb-1">
                    Premium HTML Viewer
                  </h3>
                  <p className="text-slate-300 text-xs max-w-2xl">
                    See the final copy exactly as it will appear on a product
                    page. Highlight any claim, copy it into your CMS, or export
                    the HTML for your automation layer.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/25 text-xs text-white hover:bg-white/10 disabled:opacity-40"
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
                    className="px-3 py-2 rounded-lg bg-white text-xs text-slate-900 font-semibold border border-white/30 shadow hover:-translate-y-[1px] transition disabled:opacity-40 disabled:shadow-none"
                  >
                    Download HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm((prev) => prev.trim())}
                    className="px-3 py-2 rounded-lg bg-amber-400 text-xs text-slate-900 font-semibold shadow hover:bg-amber-300"
                  >
                    Search in text
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search headline, claims, or FAQs"
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-300 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-200">
                    Live highlight
                  </span>
                </div>

                <div className="rounded-2xl bg-white text-slate-900 shadow-inner border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                        Rendered description
                      </p>
                      <p className="text-xs text-slate-600 m-0">
                        Mirrors your custom GPT instructions — headings, lists,
                        disclaimers, and manuals stay structured.
                      </p>
                    </div>
                    {isPreviewResult && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
                        Preview only — sign in to persist
                      </span>
                    )}
                  </div>
                  <div className="prose prose-slate max-w-none px-6 py-5 text-sm">
                    {descriptionHtml ? (
                      <article
                        className="prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h3:mt-4 prose-ul:list-disc prose-li:marker:text-slate-400"
                        dangerouslySetInnerHTML={{
                          __html: highlightedDescription,
                        }}
                      />
                    ) : (
                      <div className="text-slate-500 text-sm italic">
                        No description generated yet. Paste a URL above and run
                        the pipeline.
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
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-50">
                  SEO structure
                </h4>
                <span className="text-[11px] text-slate-400">
                  Driven by custom instructions
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700">
                  <p className="text-[11px] uppercase text-slate-400 mb-1">
                    H1
                  </p>
                  <p className="font-semibold text-slate-50">
                    {seoPayload?.h1 ??
                      seoPayload?.name_best ??
                      "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700">
                  <p className="text-[11px] uppercase text-slate-400 mb-1">
                    Page title
                  </p>
                  <p className="font-semibold text-slate-50">
                    {seoPayload?.pageTitle ??
                      seoPayload?.title ??
                      "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700">
                  <p className="text-[11px] uppercase text-slate-400 mb-1">
                    Meta description
                  </p>
                  <p className="text-slate-100 leading-relaxed">
                    {seoPayload?.metaDescription ??
                      seoPayload?.meta_description ??
                      "Not yet generated"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-700">
                  <p className="text-[11px] uppercase text-slate-400 mb-1">
                    Short description
                  </p>
                  <p className="text-slate-100">
                    {seoPayload?.seoShortDescription ??
                      seoPayload?.seo_short_description ??
                      "Not yet generated"}
                  </p>
                </div>
              </div>
            </div>

            {/* Features + parked extras */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-50">
                  Feature bullets
                </h4>
                <span className="text-[11px] text-slate-400">
                  What the enforcer kept
                </span>
              </div>
              {Array.isArray(features) && features.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-100">
                  {features.map((feat: string, idx: number) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-xs">
                  No features captured yet. Generate SEO to see normalized
                  bullets.
                </p>
              )}

              {parkedExtras.length > 0 && (
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRawExtras((v) => !v)}
                    className="text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
                  >
                    {showRawExtras ? "Hide" : "Show"} parked extras (
                    {parkedExtras.length})
                  </button>
                  {showRawExtras && (
                    <pre className="mt-2 p-3 rounded-lg bg-slate-950/70 text-[11px] text-slate-100 border border-slate-700 overflow-auto">
                      {JSON.stringify(
                        Object.fromEntries(parkedExtras),
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Debug: Source SEO */}
            {jobData && ingestionId && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-50">
                    Source SEO (scraped)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Live from ingestion
                  </span>
                </div>
                <pre className="bg-slate-950/70 border border-slate-700 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    jobData.normalized_payload ?? jobData,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {/* Debug: raw ingest response */}
            {rawIngestResponse && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-50">
                    Raw /api/v1/ingest response
                  </h4>
                  {pollingState && (
                    <span className="text-[11px] text-slate-400">
                      {pollingState}
                    </span>
                  )}
                </div>
                <pre className="bg-slate-950/70 border border-slate-700 rounded-lg p-3 text-[11px] text-slate-100 whitespace-pre-wrap break-words">
                  {JSON.stringify(rawIngestResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Inline preview if no ingestionId but we got a payload */}
            {job && !ingestionId && (job.seo_payload || job.seoPayload) && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl shadow-slate-900/50 p-4 space-y-2 text-xs text-slate-100">
                <h5 className="text-xs font-semibold text-slate-50">
                  Preview Generated SEO
                </h5>
                <p>
                  <strong>H1:</strong>{" "}
                  {(job.seo_payload ?? job.seoPayload)?.h1 ?? ""}
                </p>
                <p>
                  <strong>Title:</strong>{" "}
                  {(job.seo_payload ?? job.seoPayload)?.title ?? ""}
                </p>
                <p>
                  <strong>Meta:</strong>{" "}
                  {(job.seo_payload ?? job.seoPayload)?.meta_description ??
                    (job.seo_payload ?? job.seoPayload)?.metaDescription ??
                    ""}
                </p>
                <div
                  className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"
                  dangerouslySetInnerHTML={{
                    __html:
                      job.description_html ||
                      job.descriptionHtml ||
                      "<em>No description generated</em>",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
