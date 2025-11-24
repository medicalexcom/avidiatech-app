"use client";

import { useState } from "react";
import IngestResult from "@/components/IngestResult";

/**
 * Extract page with module toggles and export type selector.
 * Submits options and export_type to /api/v1/ingest.
 */
export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // toggles (default UX: on for SEO/specs/docs, variants optional)
  const [includeSeo, setIncludeSeo] = useState(true);
  const [includeSpecs, setIncludeSpecs] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [includeVariants, setIncludeVariants] = useState(false);

  // export type
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">("JSON");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setJobId(null);
    setError(null);

    try {
      const body = {
        url,
        options: {
          includeSeo,
          includeSpecs,
          includeDocs,
          includeVariants,
        },
        export_type: exportType, // persisted with the job for export pipeline
        correlation_id: `corr_${Date.now()}`,
      };

      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `ingest request failed: ${res.status}`);
        return;
      }

      const id = data?.jobId || data?.job_id || data?.id || null;
      if (!id) {
        setError("ingest did not return a job id");
        return;
      }

      setJobId(String(id));
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Extract</h1>
      <p className="mb-4">
        Ingest a product URL. We always run a full raw extraction; choose which modules to generate now.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="url" className="block font-medium mb-1">Product URL to Ingest</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/product"
            className="w-full border rounded px-3 py-2 text-black"
            required
          />
        </div>

        <fieldset className="grid grid-cols-2 gap-4 p-3 border rounded">
          <legend className="font-medium">Include modules now</legend>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={includeSeo} onChange={() => setIncludeSeo(!includeSeo)} />
            <span>Include SEO?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={includeSpecs} onChange={() => setIncludeSpecs(!includeSpecs)} />
            <span>Include Specs?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={includeDocs} onChange={() => setIncludeDocs(!includeDocs)} />
            <span>Include Manuals / PDF extraction?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={includeVariants} onChange={() => setIncludeVariants(!includeVariants)} />
            <span>Generate Variants? (optional)</span>
          </label>
        </fieldset>

        <div className="flex items-center gap-4">
          <label className="font-medium">Export type</label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as any)}
            className="border rounded px-2 py-1"
          >
            <option value="JSON">JSON</option>
            <option value="Shopify">Shopify</option>
            <option value="BigCommerce">BigCommerce</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Ingesting…" : "Ingest"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}

      {jobId && (
        <div className="mt-6">
          <h2 className="text-xl font-medium mb-2">Ingestion Result</h2>
          <IngestResult jobId={jobId} onClose={() => setJobId(null)} />
        </div>
      )}
    </div>
  );
}
