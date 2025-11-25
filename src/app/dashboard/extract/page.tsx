"use client";

import { useState } from "react";
import IngestResult from "@/components/IngestResult";

/**
 * Extract page with "Full extract" default and mutually-exclusive module toggles.
 *
 * NOTE: Per the new architecture, Extract never generates AvidiaSEO/GPT output.
 * The UI will NOT include an "Include SEO" toggle. To generate AvidiaSEO, users
 * must click "Generate SEO Description →" which navigates to the AvidiaSEO module.
 */
export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Full extract default true
  const [fullExtract, setFullExtract] = useState(true);

  // individual modules (SEO removed from the extract options)
  const [includeSpecs, setIncludeSpecs] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(false);
  const [includeVariants, setIncludeVariants] = useState(false);

  // export type
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">("JSON");

  // If the user toggles any individual module ON, disable fullExtract.
  function onToggleModule(setter: (v: boolean) => void, value: boolean) {
    if (!value) {
      // user turned a module ON -> disable fullExtract
      setFullExtract(false);
    }
    setter(!value);
  }

  // If the user explicitly turns fullExtract ON, clear individual selections (they'll be implied)
  function onToggleFullExtract() {
    const next = !fullExtract;
    setFullExtract(next);
    if (next) {
      setIncludeSpecs(false);
      setIncludeDocs(false);
      setIncludeVariants(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setJobId(null);
    setError(null);

    try {
      // Build body: don't request AvidiaSEO here. Extract stores source_seo only.
      const body: any = {
        url,
        export_type: exportType,
        correlationId: `corr_${Date.now()}`,
        fullExtract,
      };

      if (!fullExtract) {
        // send only the explicit non-SEO module options
        body.options = {
          includeSpecs,
          includeDocs,
          includeVariants,
        };
      }

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
        Ingest a product URL. Extract performs raw scraping and normalization only.
        AvidiaSEO (GPT-generated title/meta/description) is handled separately — use
        "Generate SEO Description →" after extraction.
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

        <div className="flex items-center gap-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={fullExtract} onChange={onToggleFullExtract} />
            <span className="font-medium">Full extract (recommended)</span>
          </label>
          <span className="text-sm text-gray-500">Runs raw extraction and captures scraped SEO under "source_seo"</span>
        </div>

        <fieldset className="grid grid-cols-2 gap-4 p-3 border rounded">
          <legend className="font-medium">Or select individual modules (turning any ON disables Full extract)</legend>

          <label className={`flex items-center space-x-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={includeSpecs}
              onChange={() => onToggleModule(setIncludeSpecs, includeSpecs)}
              disabled={fullExtract}
            />
            <span>Include Specs?</span>
          </label>

          <label className={`flex items-center space-x-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={includeDocs}
              onChange={() => onToggleModule(setIncludeDocs, includeDocs)}
              disabled={fullExtract}
            />
            <span>Include Manuals / PDF extraction?</span>
          </label>

          <label className={`flex items-center space-x-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={includeVariants}
              onChange={() => onToggleModule(setIncludeVariants, includeVariants)}
              disabled={fullExtract}
            />
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
