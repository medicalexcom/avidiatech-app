'use client';

import { useState } from 'react';
import { ingestProduct, parsePdf, runOcr } from '@/lib/api';

export default function IngestPage() {
  const [url, setUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIngest() {
    setLoading(true);
    setError(null);
    try {
      const res = await ingestProduct(url);
      setResult(res);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleParsePdf() {
    if (!pdfFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await parsePdf(pdfFile);
      setResult(res);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunOcr() {
    if (!ocrFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await runOcr(ocrFile);
      setResult(res);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Ingest Product</h2>

      <div className="mb-4">
        <label className="block font-medium mb-1">Product URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border p-2 w-full"
          placeholder="https://example.com/product"
        />
        <button
          onClick={handleIngest}
          disabled={!url || loading}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Ingest
        </button>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Parse PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <button
          onClick={handleParsePdf}
          disabled={!pdfFile || loading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Parse PDF
        </button>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Run OCR (Image)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <button
          onClick={handleRunOcr}
          disabled={!ocrFile || loading}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          Run OCR
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {result && (
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
