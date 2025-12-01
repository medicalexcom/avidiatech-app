"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type AnyObj = Record<string, any>;

type SeoApiResponse = {
  ok: boolean;
  ingestionId?: string;
  seoId?: string;
  url?: string;
  descriptionHtml?: string;
  seoPayload?: { h1: string; title: string; metaDescription: string };
  features?: string[];
  autohealLog?: AnyObj;
  error?: { code: string; message: string };
};

export default function AvidiaSeoPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const ingestionIdFromQS = sp?.get("ingestionId") || null;
  const urlFromQS = sp?.get("url") || "";

  const [ingestionId, setIngestionId] = useState<string | null>(ingestionIdFromQS);
  const [urlInput, setUrlInput] = useState<string>(urlFromQS);
  const [result, setResult] = useState<SeoApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingSource, setGeneratingSource] = useState<"top" | "bottom" | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (ingestionIdFromQS && ingestionIdFromQS !== ingestionId) setIngestionId(ingestionIdFromQS);
  }, [ingestionIdFromQS, ingestionId]);

  function assistantHtml() {
    const html = result?.descriptionHtml ?? "";
    if (!result?.ok || !html) return <p className="text-sm text-gray-600">No AvidiaSEO output for this ingestion yet.</p>;
    return (
      <div
        className="rounded border bg-white p-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  async function runSeoWithUrl(source: "top" | "bottom") {
    if (lockRef.current) return;
    if (!urlInput?.trim()) { setError("Please enter a product URL."); return; }

    lockRef.current = true;
    setGeneratingSource(source);
    setError(null);
    setResult(null);

    try {
      // Single call: let /api/v1/seo handle ingest + persist + SEO
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const json: SeoApiResponse = await res.json();

      if (res.status === 401 || json?.error?.code === "UNAUTHORIZED") {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/sign-in?redirect=${redirect}`);
        return;
      }
      if (!json.ok) {
        setError(json?.error?.message || `SEO failed (${res.status})`);
        return;
      }

      // Save ingestionId returned by SEO API
      if (json.ingestionId) {
        setIngestionId(json.ingestionId);
        // update URL so a refresh keeps context
        const qs = new URLSearchParams(window.location.search);
        qs.set("ingestionId", json.ingestionId);
        router.replace(`${window.location.pathname}?${qs.toString()}`);
      }

      setResult(json);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setGeneratingSource(null);
      lockRef.current = false;
    }
  }

  async function runSeoOnExistingIngestion(source: "top" | "bottom") {
    if (lockRef.current) return;
    if (!ingestionId) { setError("Missing ingestionId."); return; }

    lockRef.current = true;
    setGeneratingSource(source);
    setError(null);

    try {
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingestionId }),
      });
      const json: SeoApiResponse = await res.json();

      if (res.status === 401 || json?.error?.code === "UNAUTHORIZED") {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/sign-in?redirect=${redirect}`);
        return;
      }
      if (!json.ok) {
        setError(json?.error?.message || `SEO failed (${res.status})`);
        return;
      }

      setResult(json);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setGeneratingSource(null);
      lockRef.current = false;
    }
  }

  async function handleGenerate(source: "top" | "bottom") {
    // If we already have an ingestionId, re-run on that. Otherwise, use URL path (single API call).
    if (ingestionId) return runSeoOnExistingIngestion(source);
    return runSeoWithUrl(source);
  }

  const topLoading = generatingSource === "top";
  const bottomLoading = generatingSource === "bottom";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              router.push(ingestionId ? `/dashboard/extract?ingestionId=${encodeURIComponent(ingestionId)}` : "/dashboard/extract")
            }
            className="rounded border px-3 py-1 text-sm"
            type="button"
          >
            ← Back to Extract
          </button>
          <h1 className="text-2xl font-semibold">AvidiaSEO</h1>
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Top card – single form */}
        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Generate SEO from URL</h2>
          <p className="mb-4 text-sm text-gray-600">
            We’ll run <strong>AvidiaExtract</strong> to create an ingestion, then <strong>AvidiaSEO</strong> with your custom instructions.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate("top");
            }}
            className="flex gap-2"
          >
            <input
              type="url"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="https://manufacturer.com/product/ABC123"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={topLoading}
            >
              {topLoading ? "Generating…" : "Generate & Save"}
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-500">
            If you’re not authenticated, you’ll be redirected to sign in.
          </p>
        </div>

        {/* Bottom card – output + rerun */}
        <div className="rounded border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">SEO Output</h3>
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={bottomLoading || (!ingestionId && !urlInput)}
              onClick={() => handleGenerate("bottom")}
            >
              {bottomLoading ? "Generating…" : ingestionId ? "Re-run on this Ingestion" : "Generate & Save"}
            </button>
          </div>

          {/* SEO preview */}
          <div className="space-y-4">
            {assistantHtml()}

            {result?.ok && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded border p-3">
                  <div className="mb-2 text-sm font-medium">H1</div>
                  <div className="text-sm">{result?.seoPayload?.h1 ?? ""}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="mb-2 text-sm font-medium">Title</div>
                  <div className="text-sm">{result?.seoPayload?.title ?? ""}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="mb-2 text-sm font-medium">Meta Description</div>
                  <div className="text-sm">{result?.seoPayload?.metaDescription ?? ""}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
