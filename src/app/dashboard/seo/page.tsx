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
          setJob(json);
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
            first.json?.description_html ?? first.json?.descriptionHtml ?? null;
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
        // If the response included normalized_payload and status completed, we could call SEO immediately,
        // but we will prefer to poll the job endpoint to confirm ingestion completed with normalized_payload.
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
    if (ingestionId) {
      await generateFromIngestion(ingestionId, true);
    } else {
      await createIngestionThenGenerate(urlInput);
    }
  }

  const seoPayload = job?.seo_payload ?? job?.seoPayload ?? null;
  const descriptionHtml =
    job?.description_html ??
    job?.descriptionHtml ??
    seoPayload?.description_html ??
    seoPayload?.descriptionHtml ??
    null;
  const features = job?.features ?? null;

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
            : job?.status === "completed" || job?.normalized_payload
            ? "done"
            : "idle",
        hint: pollingState || job?.status || "waiting",
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
    job?.normalized_payload,
    job?.status,
    loading,
    pollingState,
    seoPayload,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
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
              className="px-3 py-2 border border-slate-700/70 rounded-lg bg-slate-900/60 text-slate-100 shadow-sm hover:border-sky-400 hover:bg-slate-900 transition"
            >
              ← Back to Extract
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 m-0">
                AvidiaSEO Studio
              </p>
              <h2 className="text-2xl font-semibold text-slate-50 m-0">
                Human-Ready SEO Canvas
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live pipeline
            </span>
            {statusMessage && (
              <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700 shadow-sm text-slate-200">
                {statusMessage}
              </span>
            )}
            {ingestionId && (
              <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/40 text-sky-100 text-xs font-medium">
                Ingestion {ingestionId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-100">
            {error}
          </div>
        )}
