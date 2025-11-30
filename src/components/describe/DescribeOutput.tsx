"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DescribeResponse } from "./types";

/**
 * Right-side output preview.
 * - Reads last Describe result from sessionStorage (the hook writes it there)
 * - Provides tabs for Overview / Features / Specs / Included / Manuals / SEO
 * - Buttons: Copy HTML / Copy SEO / Download JSON / Send to Import
 */

const STORAGE_KEY = "avidia:describe:lastResult";

function useLastResult() {
  const [result, setResult] = useState<DescribeResponse | null>(null);
  useEffect(() => {
    function load() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return setResult(null);
        setResult(JSON.parse(raw));
      } catch {
        setResult(null);
      }
    }
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);
  return { result, setResult };
}

export default function DescribeOutput() {
  const { result } = useLastResult();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    // when result changes, reset tab to overview
    setTab("overview");
  }, [result]);

  const html = result?.descriptionHtml ?? "";
  const seo = result?.seo ?? {};

  function copyHTML() {
    navigator.clipboard.writeText(html).then(() => alert("HTML copied to clipboard"));
  }
  function copySEO() {
    navigator.clipboard.writeText(JSON.stringify(seo, null, 2)).then(() => alert("SEO copied to clipboard"));
  }
  function downloadJSON() {
    const data = result ?? {};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `describe-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function sendToImport() {
    // Use sessionStorage to pass payload to import page (simple, robust)
    sessionStorage.setItem("avidia:import:payload", JSON.stringify(result ?? {}));
    // navigate to import page
    window.location.href = "/dashboard/import";
  }

  if (!result) {
    return (
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <div className="text-sm text-slate-500">No generated description yet. Fill the form and click Generate.</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="text-xs text-slate-500">Generated from: {result?.normalizedPayload?.source ?? "Describe"}</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={copyHTML} className="px-3 py-1 border rounded text-sm">Copy HTML</button>
          <button onClick={copySEO} className="px-3 py-1 border rounded text-sm">Copy SEO</button>
          <button onClick={downloadJSON} className="px-3 py-1 border rounded text-sm">Download JSON</button>
          <button onClick={sendToImport} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Send to Import</button>
        </div>
      </div>

      <div className="flex gap-4 border-b pb-3 mb-3">
        <button onClick={() => setTab("overview")} className={`text-sm ${tab === "overview" ? "font-semibold" : "text-slate-500"}`}>Overview</button>
        <button onClick={() => setTab("features")} className={`text-sm ${tab === "features" ? "font-semibold" : "text-slate-500"}`}>Features</button>
        <button onClick={() => setTab("specs")} className={`text-sm ${tab === "specs" ? "font-semibold" : "text-slate-500"}`}>Specs</button>
        <button onClick={() => setTab("included")} className={`text-sm ${tab === "included" ? "font-semibold" : "text-slate-500"}`}>Included</button>
        <button onClick={() => setTab("manuals")} className={`text-sm ${tab === "manuals" ? "font-semibold" : "text-slate-500"}`}>Manuals</button>
        <button onClick={() => setTab("seo")} className={`text-sm ${tab === "seo" ? "font-semibold" : "text-slate-500"}`}>SEO</button>
      </div>

      <div>
        {tab === "overview" && (
          <div dangerouslySetInnerHTML={{ __html: result.sections?.overview ?? html }} />
        )}

        {tab === "features" && (
          <ul className="list-disc pl-5">
            {(result.sections?.features ?? []).map((f, i) => (
              <li key={i} className="mb-1">{f}</li>
            ))}
          </ul>
        )}

        {tab === "specs" && (
          <div>
            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded">{JSON.stringify(result.sections?.specsSummary ?? {}, null, 2)}</pre>
          </div>
        )}

        {tab === "included" && (
          <ul className="list-disc pl-5">
            {(result.sections?.includedItems ?? []).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        )}

        {tab === "manuals" && (
          <div dangerouslySetInnerHTML={{ __html: result.sections?.manualsSectionHtml ?? "<em>No manuals found</em>" }} />
        )}

        {tab === "seo" && (
          <div className="space-y-2">
            <div><strong>H1:</strong> {result.seo?.h1}</div>
            <div><strong>Page title:</strong> {result.seo?.pageTitle}</div>
            <div><strong>Meta description:</strong> <div className="text-sm text-slate-500">{result.seo?.metaDescription}</div></div>
            <div><strong>Short SEO:</strong> <div className="text-sm text-slate-500">{result.seo?.seoShortDescription}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
