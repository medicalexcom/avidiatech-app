// src/app/dashboard/seo/page.tsx
"use client";

import { useRef, useState } from "react";

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

export default function AvidiaSeoPage() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const lockRef = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockRef.current || isSubmitting) return;
    lockRef.current = true;
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/seo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json: SeoResult = await res.json();
      setResult(json);
    } catch (err: any) {
      setResult({ ok: false, error: { code: "NETWORK", message: String(err?.message || err) } });
    } finally {
      setIsSubmitting(false);
      lockRef.current = false;
    }
  }

  const hasOutput = !!(result && result.ok);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <button
        onClick={() => history.back()}
        className="rounded border px-3 py-1 text-sm"
        type="button"
      >
        ← Back to Extract
      </button>

      {/* Error banner (from previous attempt) */}
      {result && !result.ok && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error:</strong> {result.error?.message ?? "Unknown error"}
        </div>
      )}

      {/* Top card: single form to generate */}
      <div className="rounded border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Generate SEO from URL</h2>
        <p className="mb-4 text-sm text-gray-600">
          This will first run <strong>AvidiaExtract</strong> on the URL to create an ingestion, then run
          <strong> AvidiaSEO</strong> using the scraped data plus your custom GPT instructions.
        </p>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="url"
            required
            className="w-full rounded border px-3 py-2"
            placeholder="https://manufacturer.com/product/ABC123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Generating…" : "Generate & Save"}
          </button>
        </form>

        <p className="mt-2 text-xs text-gray-500">
          We’ll attempt to persist both the ingestion and SEO output. If your session isn’t authenticated, you’ll be redirected to sign in.
        </p>
      </div>

      {/* Bottom card: SEO Output (disabled until result exists) */}
      <div className="rounded border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">SEO Output</h3>
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            disabled={!hasOutput || isSubmitting}
            onClick={() => {
              // placeholder for future "Save Edits" flow
            }}
          >
            Save Edits
          </button>
        </div>

        {!hasOutput && <p className="text-sm text-gray-600">No AvidiaSEO output for this ingestion yet.</p>}

        {hasOutput && (
          <div className="space-y-4">
            <div className="rounded border p-3">
              <div className="mb-2 text-sm text-gray-500">Preview</div>
              {/* Render HTML safely (you can swap for a sanitizer) */}
              <div dangerouslySetInnerHTML={{ __html: result!.descriptionHtml || "" }} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">H1</div>
                <div className="text-sm">{result!.seoPayload?.h1}</div>
              </div>
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Title</div>
                <div className="text-sm">{result!.seoPayload?.title}</div>
              </div>
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Meta Description</div>
                <div className="text-sm">{result!.seoPayload?.metaDescription}</div>
              </div>
            </div>

            {result!.features?.length ? (
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Features</div>
                <ul className="list-disc pl-6 text-sm">
                  {result!.features!.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
