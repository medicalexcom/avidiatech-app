import { useState } from 'react';

/**
 * Extract page
 *
 * This page allows a user to submit a product URL for ingestion.  It calls
 * the API route defined at `/api/v1/ingest` and displays the returned
 * JSON.  It also retains the original introductory content explaining
 * the capabilities of the Extract product.
 */
export default function ExtractPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: 'An unexpected error occurred during ingestion.' });
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
          {loading ? 'Ingesting…' : 'Ingest'}
        </button>
      </form>
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-medium mb-2">Ingestion Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
