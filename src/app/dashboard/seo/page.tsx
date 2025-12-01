"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type AnyObj = Record<string, any>;
type SeoResult = {
  ok: boolean;
  ingestionId?: string;
  seoId?: string;
  url?: string;
  descriptionHtml?: string;
  seoPayload?: { h1: string; title: string; metaDescription: string };
  features?: string[];
  autohealLog?: { appliedRules: string[]; notes: string[] };
  error?: { code: string; message: string };
};

function normalizeSeoResponse(resp: AnyObj | null | undefined) {
  if (!resp) return null;
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const ingestionIdFromParams = searchParams?.get("ingestionId") || null;
  const urlParam = searchParams?.get("url") || "";

  const [ingestionId, setIngestionId] = useState<string | null>(ingestionIdFromParams);
  const [urlInput, setUrlInput] = useState<string>(urlParam);

  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: track which button is generating ("top" | "bottom" | null)
  const [generatingSource, setGeneratingSource] = useState<"top" | "bottom" | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (ingestionIdFromParams && ingestionIdFromParams !== ingestionId) {
      setIngestionId(ingestionIdFromParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionIdFromParams]);

  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
        const normalized = normalizeSeoResponse(json);
        if (!cancelled) setJob(normalized?.raw ?? normalized);
      } catch (err: any) {
        if (!cancelled) setError(String(err?.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ingestionId]);

  function buildRedirectPath() {
    if (typeof window === "undefined") return "/dashboard/seo";
    return window.location.pathname + window.location.search;
  }

  async function generateFromIngestion(source: "top" | "bottom") {
    if (lockRef.current) return;
    if (!ingestionId) { setError("Missing ingestion id"); return; }

    lockRef.current = true;
    setGeneratingSource(source);
    setError(null);

    try {
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
        setError(json?.error?.message || json?.error || `SEO generation failed: ${res.status}`);
        return;
      }

      // refresh ingestion to get persisted SEO
      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(ingestionId)}`);
      const refJson = await refresh.json();
      const normalized = refresh.ok ? normalizeSeoResponse(refJson) : normalizeSeoResponse(json);
      setJob(normalized?.raw ?? normalized);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGeneratingSource(null);
      lockRef.current = false;
    }
  }

  async function generateFromUrlAndSeo(source: "top" | "bottom") {
    if (lockRef.current) return;
    if (!urlInput) { setError("Please enter a URL"); return; }

    lockRef.current = true;
    setGeneratingSource(source);
    setError(null);

    try {
      // 1) Ingest
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
      if (!ingestRes.ok) { setError(ingestJson?.error?.message || `Ingest failed: ${ingestRes.status}`); return; }

      const newIngestionId =
        ingestJson?.ingestionId ?? ingestJson?.ingestion_id ?? ingestJson?.id ?? ingestJson?.job?.ingestionId ?? null;

      if (!newIngestionId) { setError("Ingest completed but no ingestionId was returned from the server."); return; }

      setIngestionId(newIngestionId);
      router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(newIngestionId)}`);

      // 2) SEO
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
      if (!seoRes.ok) { setError(seoJson?.error?.message || `SEO generation failed: ${seoRes.status}`); return; }

      const refresh = await fetch(`/api/v1/ingest/${encodeURIComponent(newIngestionId)}`);
      const refJson = await refresh.json();
      const normalized = refresh.ok ? normalizeSeoResponse(refJson) : normalizeSeoResponse(seoJson);
      setJob(normalized?.raw ?? normalized);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setGeneratingSource(null);
      lockRef.current = false;
    }
  }

  async function handleGenerateAndSave(source: "top" | "bottom") {
    setError(null);
    if (ingestionId) await generateFromIngestion(source);
    else await generateFromUrlAndSeo(source);
  }

  const renderPreview = () => {
    const seoPayload = job?.seo_payload ?? job?.seoPayload ?? null;
    const descriptionHtml = job?.description_html ?? job?.descriptionHtml ?? null;

    if (!seoPayload && !descriptionHtml) {
      return <div className="text-gray-600">No AvidiaSEO output for this ingestion yet.</div>;
    }

    return (
      <>
        <h3 className="text-lg font-semibold mb-2">Generated SEO (AvidiaSEO)</h3>
        {seoPayload && (
          <div className="text-sm">
            <div><strong>H1:</strong> {seoPayload.h1 ?? ""}</div>
            <div><strong>Title:</strong> {seoPayload.title ?? ""}</div>
            <div><strong>Meta:</strong> {seoPayload.metaDescription ?? ""}</div>
          </div>
        )}
        <h4 className="mt-3 font-medium">HTML Description</h4>
        <div
          className="mt-1 rounded border bg-white p-3"
          dangerouslySetInnerHTML={{ __html: descriptionHtml || "<em>No description generated yet</em>" }}
        />
      </>
    );
  };

  const topLoading = generatingSource === "top";
  const bottomLoading = generatingSource === "bottom";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => router.push(ingestionId ? `/dashboard/extract?ingestionId=${encodeURIComponent(ingestionId)}` : "/dashboard/extract")}
            className="rounded border px-2 py-1 text-sm"
          >
            ← Back to Extract
          </button>
          <h1 className="text-2xl font-semibold">AvidiaSEO</h1>
          {ingestionId && <span className="text-xs text-gray-600">Ingestion ID: <code>{ingestionId}</code></span>}
        </div>

        {loading && <div className="mb-3 text-sm text-gray-600">Loading ingestion…</div>}
        {error && <div className="mb-3 text-sm text-red-600"><strong>Error:</strong> {error}</div>}

        {/* Top block: URL flow (only when no ingestionId) */}
        {!ingestionId && (
          <div className="mb-6 rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Generate SEO from URL</h2>
            <p className="mb-3 text-sm text-gray-600">
              We’ll run <strong>AvidiaExtract</strong> to create an ingestion, then <strong>AvidiaSEO</strong> with your custom instructions.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://manufacturer.com/product/..."
                className="min-w-[260px] flex-1 rounded border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleGenerateAndSave("top")}
                disabled={topLoading}
                className="rounded bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {topLoading ? "Generating…" : "Generate & Save"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">If you’re not authenticated, you’ll be redirected to sign in.</p>
          </div>
        )}

        {/* Ingestion context (optional) */}
        {ingestionId && job && (
          <div className="rounded border bg-white p-3 text-xs text-gray-700">
            <strong>Ingestion ready.</strong> You can re-run AvidiaSEO on this ingestion.
          </div>
        )}

        {/* Output block */}
        <div className="mt-6 rounded border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">SEO Output</h2>
            <button
              type="button"
              onClick={() => handleGenerateAndSave("bottom")}
              disabled={bottomLoading || (!ingestionId && !urlInput)}
              className="rounded bg-sky-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {bottomLoading ? "Generating…" : ingestionId ? "Re-run on this Ingestion" : "Generate & Save"}
            </button>
          </div>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
