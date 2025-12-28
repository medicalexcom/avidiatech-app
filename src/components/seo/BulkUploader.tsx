import React, { useMemo, useState } from "react";

/**
 * Simple BulkUploader: paste CSV-like (url,price) lines or newline-separated urls.
 * Preview parsed rows and submit to POST /api/v1/seo/bulk
 */

export default function BulkUploader({ onCreated }: { onCreated?: (bulkJobId: string) => void }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => {
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, i) => {
        const parts = l.split(/[\t,]+/).map((p) => p.trim());
        return { url: parts[0], price: parts[1] ?? null, idx: i + 1 };
      });
  }, [text]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rows.length) return setError("No rows to submit");
    setSubmitting(true);
    try {
      const body = { name: name || `Bulk ${new Date().toISOString()}`, items: rows.map((r) => ({ url: r.url, price: r.price })), options: { mode } };
      const res = await fetch("/api/v1/seo/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) {
        setError(j?.error || "submit_failed");
      } else {
        if (onCreated && j?.bulkJobId) onCreated(j.bulkJobId);
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Job name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
        </div>

        <div>
          <label className="block text-sm font-medium">Paste URLs (one per line). Optional: url,price</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="https://example.com/p1,19.99" rows={6} className="mt-1 w-full rounded border px-2 py-1" />
          <div className="text-xs text-slate-500 mt-1">Lines parsed: {rows.length}</div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm">Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="rounded border px-2 py-1 text-sm">
            <option value="quick">Quick (extract+seo)</option>
            <option value="full">Full (extract+seo+audit+import+monitor+price)</option>
          </select>
        </div>

        {error && <div className="text-sm text-rose-600">{error}</div>}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={submitting} className="rounded bg-cyan-600 text-white px-3 py-1">
            {submitting ? "Submitting…" : "Create bulk job"}
          </button>
          <button type="button" onClick={() => { setText(""); setName(""); }} className="rounded border px-3 py-1">Clear</button>
        </div>
      </form>

      <div className="mt-3">
        {rows.length > 0 && (
          <table className="w-full text-sm border">
            <thead>
              <tr><th className="p-1 border">#</th><th className="p-1 border">URL</th><th className="p-1 border">Price</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.idx}><td className="p-1 border">{r.idx}</td><td className="p-1 border truncate">{r.url}</td><td className="p-1 border">{r.price ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
