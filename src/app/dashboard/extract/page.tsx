"use client";

import { useState } from "react";
import IngestResult from "@/components/IngestResult";

/**
 * Extract page with "Full extract" default and mutually-exclusive module toggles.
 *
 * Behavior:
 * - Full Extract is ON by default (runs full extraction & all modules).
 * - If the user toggles any individual module ON, Full Extract is automatically turned OFF.
 * - If Full Extract is ON, individual module checkboxes are disabled (visually indicating they are included).
 * - Export type and correlation_id are preserved and sent to the gateway.
 */
export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UX: Full extract default true
  const [fullExtract, setFullExtract] = useState(true);

  // individual modules (start false but ignored while fullExtract === true)
  const [includeSeo, setIncludeSeo] = useState(false);
  const [includeSpecs, setIncludeSpecs] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(false);
  const [includeVariants, setIncludeVariants] = useState(false);

  // export type
  const [exportType, setExportType] = useState<"JSON" | "Shopify" | "BigCommerce">("JSON");

  // If the user toggles any individual module ON, disable fullExtract.
  function onToggleModule(setter: (v: boolean) => void, value: boolean) {
    if (!value) {
      // turning a module ON (value is current state; we will set opposite)
      // disable fullExtract when turning any module ON
      setFullExtract(false);
    }
    setter(!value);
  }

  // If the user explicitly turns fullExtract ON, clear individual selections (they'll be implied)
  function onToggleFullExtract() {
    const next = !fullExtract;
    setFullExtract(next);
    if (next) {
      // clear explicit selections to avoid confusion (they are implicit)
      setIncludeSeo(false);
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
      // If fullExtract is true, we send fullExtract flag and minimal options.
      // Server will map fullExtract to options.include* = true.
      const body: any = {
        url,
        export_type: exportType,
        correlationId: `corr_${Date.now()}`,
        fullExtract,
      };

      if (!fullExtract) {
        // only include explicit options user selected
        body.options = {
          includeSeo,
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
        Ingest a product URL. We always perform a full raw extraction; choose whether to
        run optional modules (SEO, Specs, Manuals, Variants) now. Full Extract runs all
        modules by default; choosing specific modules disables Full Extract.
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
          <span className="text-sm text-gray-500">Runs raw extraction + all modules</span>
        </div>

        <fieldset className="grid grid-cols-2 gap-4 p-3 border rounded">
          <legend className="font-medium">Or select individual modules (turning any ON disables Full extract)</legend>

          <label className={`flex items-center space-x-2 ${fullExtract ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={includeSeo}
              onChange={() => onToggleModule(setIncludeSeo, includeSeo)}
              disabled={fullExtract}
            />
            <span>Include SEO?</span>
          </label>

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
