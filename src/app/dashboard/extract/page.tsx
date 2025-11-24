"use client";

import { useState } from "react";
import IngestResult from "@/components/IngestResult";

/**
 * Extract page
 *
 * This page allows a user to submit a product URL for ingestion. It calls
 * the API route defined at `/api/v1/ingest`, then shows the IngestResult
 * component which polls the status endpoint until the normalized result is ready.
 */
export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setJobId(null);
    setError(null);

    try {
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          options: {},
          correlation_id: `corr_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `ingest request failed: ${res.status}`);
        return;
      }

      // Expect { jobId, status: "accepted" }
      const id = data?.jobId || data?.job_id || data?.id || null;
      if (!id) {
        setError("ingest did not return a job id");
        return;
      }

      // show the IngestResult component which will poll /api/v1/ingest/:id
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
        Our Extract product uses advanced crawling and scraping to collect data from any
        source—websites, PDFs, catalogs, and more.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          AI‑powered parsing extracts attributes, images, and pricing from semi‑structured
          pages
        </li>
        <li>Supports e‑commerce sites, manufacturer catalogs, and marketplaces</li>
        <li>Schedule automated extractions to keep your catalog up to date</li>
        <li>
          Seamlessly integrates with our Describe, Match, Validate, and Visualize products
        </li>
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="url" className="block font-medium mb-1">
            Product URL to Ingest
          </label>
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
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Ingesting…" : "Ingest"}
        </button>
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
