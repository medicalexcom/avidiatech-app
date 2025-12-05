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

  const statusPills = useMemo(() => {
    const hasSeo = Boolean(seoPayload || descriptionHtml || features);
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
    descriptionHtml,
    features,
    generating,
    jobData?.normalized_payload,
    jobData?.status,
    loading,
    pollingState,
    seoPayload,
  ]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-sky-300 transition"
            >
              ← Back to Extract
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 m-0">
                AvidiaSEO Studio
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 m-0">
                Human-Ready SEO Canvas
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live status
            </span>
            {statusMessage && (
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700">
                {statusMessage}
              </span>
            )}
            {ingestionId && (
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-medium">
                Ingestion {ingestionId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl p-6 border border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300 mb-1">
                    Description window
                  </p>
                  <h3 className="text-3xl font-semibold mb-2">
                    Premium HTML Viewer
                  </h3>
                  <p className="text-slate-300 text-sm max-w-2xl">
                    See the generated marketing narrative exactly as your
                    customers will. Search, copy, download, and curate—all
                    within the canvas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
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
                    className="px-3 py-2 rounded-lg bg-white text-slate-900 font-semibold border border-white/30 shadow hover:-translate-y-0.5 transition disabled:opacity-50"
                  >
                    Download HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm((prev) => prev.trim())}
                    className="px-3 py-2 rounded-lg bg-amber-400 text-slate-900 font-semibold shadow hover:bg-amber-300"
                  >
                    Search in text
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search headline, claims, or FAQs"
                    className="flex-1 bg-transparent text-white placeholder:text-slate-300 focus:outline-none"
                  />
                  <span className="text-xs text-slate-200">Live highlight</span>
                </div>

                <div className="rounded-xl bg-white text-slate-900 shadow-inner border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                        Rendered description
                      </p>
                      <p className="text-sm text-slate-600 m-0">
                        Mirrors our custom GPT instructions layout; highlights
                        show your search focus.
                      </p>
                    </div>
                    {isPreviewResult && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        Preview only — sign in to persist
                      </span>
                    )}
                  </div>
                  <div className="prose prose-slate max-w-none px-6 py-5">
                    {descriptionHtml ? (
                      <article
                        className="prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h3:mt-4 prose-ul:list-disc prose-li:marker:text-slate-400"
                        dangerouslySetInnerHTML={{
                          __html: highlightedDescription,
                        }}
                      />
                    ) : (
                      <div className="text-slate-500 text-sm italic">
                        No description generated yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-900">
                    SEO structure
                  </h4>
                  <span className="text-xs text-slate-500">
                    Aligned to custom instructions
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase text-slate-500 mb-1">H1</p>
                    <p className="font-semibold text-slate-900">
                      {seoPayload?.h1 ??
                        seoPayload?.name_best ??
                        "Not yet generated"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase text-slate-500 mb-1">
                      Page Title
                    </p>
                    <p className="font-semibold text-slate-900">
                      {seoPayload?.pageTitle ??
                        seoPayload?.title ??
                        "Not yet generated"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase text-slate-500 mb-1">
                      Meta Description
                    </p>
                    <p className="text-slate-800 leading-relaxed">
                      {seoPayload?.metaDescription ??
                        seoPayload?.meta_description ??
                        "Not yet generated"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase text-slate-500 mb-1">
                      Short Description
                    </p>
                    <p className="text-slate-800">
                      {seoPayload?.seoShortDescription ??
                        seoPayload?.seo_short_description ??
                        "Not yet generated"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Feature bullets
                  </h4>
                  <span className="text-xs text-slate-500">
                    What the enforcer kept
                  </span>
                </div>
                {Array.isArray(features) && features.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-800">
                    {features.map((feat: string, idx: number) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">
                    No features captured yet.
                  </p>
                )}

                {parkedExtras.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowRawExtras((v) => !v)}
                      className="text-sm text-sky-700 underline"
                    >
                      {showRawExtras ? "Hide" : "Show"} parked extras (
                      {parkedExtras.length})
                    </button>
                    {showRawExtras && (
                      <pre className="mt-2 p-3 rounded-lg bg-slate-50 text-xs text-slate-700 border border-slate-100 overflow-auto">
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-slate-900">
                  Pipeline status
                </h4>
                {loading && (
                  <span className="text-xs text-slate-500">Loading…</span>
                )}
              </div>
              <div className="space-y-3">
                {statusPills.map((pill) => (
                  <div
                    key={pill.key}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                      pill.state === "done"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : pill.state === "active"
                        ? "bg-amber-50 border-amber-100 text-amber-700"
                        : "bg-slate-50 border-slate-100 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          pill.state === "done"
                            ? "bg-emerald-500"
                            : pill.state === "active"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-slate-300"
                        }`}
                      />
                      <span className="font-medium text-sm">
                        {pill.label}
                      </span>
                    </div>
                    <span className="text-xs">{pill.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            {jobData && ingestionId && (
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Source SEO (scraped)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Live from ingestion
                  </span>
                </div>
                <pre className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    jobData.normalized_payload ?? jobData,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {rawIngestResponse && (
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Raw /api/v1/ingest response
                  </h4>
                  {pollingState && (
                    <span className="text-xs text-slate-500">
                      {pollingState}
                    </span>
                  )}
                </div>
                <pre className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
                  {JSON.stringify(rawIngestResponse, null, 2)}
                </pre>
              </div>
            )}

            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">
                  Generate SEO from a URL
                </h4>
                <span className="text-xs text-slate-500">
                  No extract required
                </span>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    type="url"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleGenerateAndSave();
                    }}
                    disabled={generating}
                    className="sm:w-48 w-full px-4 py-3 rounded-lg bg-sky-600 text-white font-semibold shadow hover:bg-sky-500 disabled:opacity-60"
                  >
                    {generating ? "Generating…" : "Generate & Save"}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Best practice: keep the manufacturer URL and action together
                  so users launch ingestion without scanning the page.
                </p>
                <p className="text-xs text-slate-500">
                  We’ll create an ingestion and then run AvidiaSEO. You’ll be
                  redirected here once ready.
                </p>
                {job && !ingestionId && (job.seo_payload || job.seoPayload) && (
                  <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                    <h5 className="text-sm font-semibold text-slate-900">
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
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
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
      </div>
    </div>
  );
}
