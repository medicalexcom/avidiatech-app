'use client';

import { useEffect, useState } from 'react';

interface HistoryRow {
  id: string;
  product_id: string;
  version: number;
  summary: string;
  changed_by: string | null;
  created_at: string;
}

export default function VersioningPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/v1/products/history');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Unable to load history');
          return;
        }
        setHistory(json.history || []);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Product History</h1>
        <p className="text-gray-700">Automated versioning captures every ingestion and description change.</p>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        {history.length === 0 && <p className="text-sm text-gray-600">No history yet.</p>}
        <ul className="space-y-3">
          {history.map((row) => (
            <li key={row.id} className="rounded border border-gray-100 p-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Product {row.product_id}</span>
                <span>v{row.version}</span>
              </div>
              <p className="text-gray-900 text-sm">{row.summary}</p>
              <p className="text-xs text-gray-500">
                {new Date(row.created_at).toLocaleString()} • {row.changed_by || 'system'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
