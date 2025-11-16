"use client";

import { useState } from "react";
import { renderPage } from "@/lib/api";

export default function RenderPage() {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await renderPage(url);
      // handle different return structures
      if (typeof result === "string") {
        setHtml(result);
      } else if (result && typeof result === "object" && "html" in result) {
        setHtml(result.html);
      } else {
        setHtml(JSON.stringify(result));
      }
    } catch (err: any) {
      setError(err.message || "Failed to render page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Render Page</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border px-3 py-2 mr-2 w-96"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Render
        </button>
      </form>
      {loading && <p>Rendering page...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {html && (
        <div className="border p-4 overflow-auto max-h-[600px]">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </main>
  );
}
