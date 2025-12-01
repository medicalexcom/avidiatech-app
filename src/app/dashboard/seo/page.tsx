"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * AvidiaSEO page (client)
 *
 * - Works with ?ingestionId=... OR plain URL input.
 * - Single primary action: "Generate & Save".
 *
 * Behavior:
 * - If ingestionId is present:
 *    -> POST /api/v1/seo with { ingestionId, persist: true }
 *    -> Re-fetch ingestion from /api/v1/ingest/:id to show persisted SEO.
 *
 * - If NO ingestionId but a URL is provided:
 *    1. POST /api/v1/ingest with { url, persist: true }  (AvidiaExtract step)
 *    2. Grab ingestionId from that response.
 *    3. POST /api/v1/seo with { ingestionId, persist: true }  (AvidiaSEO step)
 *    4. Re-fetch ingestion and update state.
 *    5. Push /dashboard/seo?ingestionId=... so URL and state stay in sync.
 *
 * - If backend rejects persistence (401 / UNAUTHORIZED_TO_PERSIST),
 *   the user is redirected to /sign-in?redirect=<current_path>.
 */

type AnyObj = Record<string, any>;

function normalizeSeoResponse(resp: AnyObj | null | undefined) {
  if (!resp) return null;

  // unwrap common wrappers
  const payload = resp?.data ?? resp?.job ?? resp;

  const seoPayload = payload?.seo_payload ?? payload?.seoPayload ?? null;
  const descriptionHtml = payload?.description_html ?? payload?.descriptionHtml ?? null;

  const sourceSeo =
    payload?.normalized_payload?.source_seo ??
    payload?.source_seo ??
    payload?.sourceSeo ??
    payload?.normalized_payload ??
    null;

  const ingestionId = payload?.id ?? payload?.ingestionId ?? payload?.ingestion_id ?? null;
  const seoId = payload?.seoId ?? payload?.seo_id ?? null;

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    source_seo: sourceSeo,
    ingestionId,
    seoId,
    raw: payload,
  };
}

export default function AvidiaSeoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ingestionIdFromParams = searchParams?.get("ingestionId") || null;
  const urlParam = searchParams?.get("url") || "";

  const [ingestionId, setIngestionId] = useState<string | null>(ingestionIdFromParams);
  const [urlInput, setUrlInput] = useState<string>(urlParam);
  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local ingestionId in sync if URL param changes (e.g. via router.push)
  useEffect(() => {
    if (ingestionIdFromParams && ingestionIdFromParams !== ingestionId) {
      setIngestionId(ingestionIdFromParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionIdFromParams]);

  // Fetch ingestion when we have an ingestionId
  useEffect(() => {
    if (!ingestionId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        }
        const normalized = normalizeSeoResponse(json);
        if (!cancelled) {
          setJob(normalized?.raw ?? normalized);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(String(err?.message || err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ingestionId]);

  function buildRedirectPath() {
    if (typeof window === "undefined") return "/dashboard/seo";
    return window.location.pathname + window.location.search;
  }

  async function generateFromIngestion() {
    if (generating) return;
    if (!ingestionId) {
      setError("Missing ingestion id");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.debug("AvidiaSEO: generateFromIngestion starting", ingestionId);

      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingestionId, persist: true }),
      });
      const json = await res.json();

      if (res.status === 401 || json?.error?.code === "UNAUTHORIZED_TO_PERSIST") {
        const redirectPath = buildRedirectPath();
        router.push(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      if (!res.ok) {
        console.warn("AvidiaSEO: generateFromIngestion error response", { status: res.status, body: json });
        setError(json?.error?.message || json?.error || `SEO generation failed: ${res.status}`);
        return;
      }

      // Re-fetch ingestion to pick up persisted SEO
      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
      const refJson = await refresh.json();

      if (!refresh.ok) {
        console.warn("AvidiaSEO: re-fetch ingestion after SEO failed, falling back", {
          status: refresh.status,
          body: refJson,
        });
        const normalized = normalizeSeoResponse(json);
        setJob(normalized?.raw ?? normalized);
      } else {
        const normalized = normalizeSeoResponse(refJson);
        setJob(normalized?.raw ?? normalized);
      }
    } catch (err: any) {
      console.error("AvidiaSEO: generateFromIngestion error", err);
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  /**
   * Option B1:
   *  - POST /api/v1/ingest with URL
   *  - Use the returned ingestionId to POST /api/v1/seo
   *  - Refresh ingestion and keep everything in sync.
   */
  async function generateFromUrlAndSeo() {
    if (generating) return;
    if (!urlInput) {
      setError("Please enter a URL");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.debug("AvidiaSEO: ingest + seo from URL starting", { url: urlInput });

      // 1) Run ingest (AvidiaExtract step)
      const ingestRes = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, persist: true }),
      });
      const ingestJson = await ingestRes.json();

      if (ingestRes.status === 401 || ingestJson?.error?.code === "UNAUTHORIZED_TO_PERSIST") {
        const redirectPath = buildRedirectPath();
        router.push(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      if (!ingestRes.ok) {
        console.warn("AvidiaSEO: ingest failed", { status: ingestRes.status, body: ingestJson });
        setError(ingestJson?.error?.message || ingestJson?.error || `Ingest failed: ${ingestRes.status}`);
        return;
      }

      const newIngestionId =
        ingestJson?.ingestionId ??
        ingestJson?.ingestion_id ??
        ingestJson?.id ??
        ingestJson?.job?.ingestionId ??
        ingestJson?.job?.ingestion_id ??
        null;

      if (!newIngestionId) {
        console.warn("AvidiaSEO: ingest response did not include ingestionId", ingestJson);
        setError("Ingest completed but no ingestionId was returned from the server.");
        return;
      }

      // Keep local state & URL in sync with new ingestionId
      setIngestionId(newIngestionId);
      router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(newIngestionId)}`);

      // 2) Run SEO on that ingestion
      const seoRes = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingestionId: newIngestionId, persist: true }),
      });
      const seoJson = await seoRes.json();

      if (seoRes.status === 401 || seoJson?.error?.code === "UNAUTHORIZED_TO_PERSIST") {
        const redirectPath = buildRedirectPath();
        router.push(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      if (!seoRes.ok) {
        console.warn("AvidiaSEO: seo failed after ingest", { status: seoRes.status, body: seoJson });
        setError(seoJson?.error?.message || seoJson?.error || `SEO generation failed: ${seoRes.status}`);
        return;
      }

      // 3) Re-fetch ingestion to pick up persisted SEO
      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(newIngestionId)}`);
      const refJson = await refresh.json();

      if (!refresh.ok) {
        console.warn("AvidiaSEO: re-fetch after URL flow failed, falling back", {
          status: refresh.status,
          body: refJson,
        });
        const normalizedSeo = normalizeSeoResponse(seoJson);
        setJob(normalizedSeo?.raw ?? normalizedSeo);
      } else {
        const normalized = normalizeSeoResponse(refJson);
        setJob(normalized?.raw ?? normalized);
      }
    } catch (err: any) {
      console.error("AvidiaSEO: generateFromUrlAndSeo error", err);
      setError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  }

  // Single primary action, switching behavior depending on context
  async function handleGenerateAndSave() {
    if (generating) return;
    setError(null);

    if (ingestionId) {
      await generateFromIngestion();
    } else {
      await generateFromUrlAndSeo();
    }
  }

  const renderPreview = () => {
    const seoPayload = job?.seo_payload ?? job?.seoPayload ?? null;
    const descriptionHtml = job?.description_html ?? job?.descriptionHtml ?? null;

    if (!seoPayload && !descriptionHtml) {
      return <div style={{ color: "#666" }}>No AvidiaSEO output for this ingestion yet.</div>;
    }

    return (
      <>
        <h3 className="text-lg font-semibold mb-2">Generated SEO (AvidiaSEO)</h3>
        {seoPayload && (
          <div>
            <div>
              <strong>H1:</strong> {seoPayload.h1 ?? seoPayload.name_best ?? ""}
            </div>
            <div>
              <strong>Title:</strong> {seoPayload.title ?? ""}
            </div>
            <div>
              <strong>Meta:</strong>{" "}
              {seoPayload.metaDescription ?? seoPayload.meta_description ?? ""}
            </div>
          </div>
        )}
        <h4 className="mt-3 font-medium">HTML Description</h4>
        <div
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            border: "1px solid #eee",
            padding: 12,
            background: "#fff",
            borderRadius: 6,
            marginTop: 4,
          }}
          dangerouslySetInnerHTML={{
            __html: descriptionHtml || "<em>No description generated yet</em>",
          }}
        />
      </>
    );
  };

  const renderSourceSummary = () => {
    if (!job) return null;
    const sourceSeo =
      job?.source_seo ?? job?.sourceSeo ?? job?.raw?.source_seo ?? job?.raw?.sourceSeo;

    const sourceUrl =
      job?.raw?.url ??
      job?.raw?.source_url ??
      job?.raw?.input_url ??
      job?.raw?.normalized_payload?.url ??
      "";

    return (
      <div className="mt-4 border rounded p-3 bg-white">
        <h3 className="font-semibold mb-1">Source / Ingest Context</h3>
        {sourceUrl && (
          <div className="text-sm mb-1">
            <strong>URL: </strong>
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {sourceUrl}
            </a>
          </div>
        )}
        {sourceSeo && (
          <div className="text-xs text-gray-600">
            <strong>Source SEO snapshot present</strong> (normalized payload available).
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header + navigation */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() =>
              router.push(
                ingestionId
                  ? `/dashboard/extract?ingestionId=${encodeURIComponent(ingestionId)}`
                  : "/dashboard/extract",
              )
            }
            className="px-2 py-1 border rounded text-sm"
          >
            ← Back to Extract
          </button>
          <h1 className="text-2xl font-semibold">AvidiaSEO</h1>
          {ingestionId && (
            <span className="text-xs text-gray-600">
              Ingestion ID: <code>{ingestionId}</code>
            </span>
          )}
        </div>

        {/* Status + error */}
        {loading && <div className="mb-3 text-sm text-gray-600">Loading ingestion…</div>}
        {error && (
          <div className="mb-3 text-sm text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* URL input when no ingestionId is present */}
        {!ingestionId && (
          <div className="mb-6 border rounded p-4 bg-white">
            <h2 className="font-semibold mb-2">Generate SEO from URL</h2>
            <p className="text-sm text-gray-600 mb-3">
              This will first run <strong>AvidiaExtract</strong> on the URL to create an ingestion,
              then run <strong>AvidiaSEO</strong> using the scraped data plus your custom GPT
              instructions.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://manufacturer.com/product/..."
                className="flex-1 min-w-[260px] border rounded px-3 py-2 text-sm"
                type="url"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleGenerateAndSave();
                }}
                disabled={generating}
                className="px-3 py-2 bg-sky-600 text-white rounded text-sm disabled:opacity-60"
              >
                {generating ? "Generating…" : "Generate & Save"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              We&apos;ll attempt to persist both the ingestion and SEO output. If your session
              isn&apos;t authenticated, you&apos;ll be redirected to sign in.
            </p>
          </div>
        )}

        {/* Ingestion context & preview */}
        {job && ingestionId && renderSourceSummary()}

        <div className="mt-6 border rounded p-4 bg-white">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold">SEO Output</h2>
            <button
              type="button"
              onClick={() => handleGenerateAndSave()}
              disabled={generating || (!ingestionId && !urlInput)}
              className="px-3 py-2 bg-sky-600 text-white rounded text-sm disabled:opacity-60"
            >
              {generating ? "Generating…" : "Generate & Save"}
            </button>
          </div>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
