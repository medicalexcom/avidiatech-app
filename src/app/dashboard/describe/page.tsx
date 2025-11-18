"use client";

import { useState } from "react";

interface DescribeResponse {
  description?: string;
  error?: string;
  [key: string]: any;
}

export default function DescribePage() {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("concise");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DescribeResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tone, language }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Describe</h1>
        <p className="text-gray-700">
          Turn product specs and raw text into production-ready descriptions. Requests are routed through the backend describe
          endpoint with billing enforcement and usage tracking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="prompt">
            Product context
          </label>
          <textarea
            id="prompt"
            className="w-full rounded border border-gray-300 p-3 text-sm text-gray-900"
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste bullet points, specs, or an existing description to rewrite"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm font-medium">
            Tone
            <select
              className="mt-1 rounded border border-gray-300 p-2 text-gray-900"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="technical">Technical</option>
              <option value="playful">Playful</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium">
            Language
            <select
              className="mt-1 rounded border border-gray-300 p-2 text-gray-900"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate description"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Describe response</h2>
          {result.error ? (
            <p className="text-red-600 text-sm">{result.error}</p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{result.description || JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
