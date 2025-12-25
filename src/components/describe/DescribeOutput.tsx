"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DescribeResponse } from "./types";

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

function htmlDoc(innerHtml: string) {
  // Minimal HTML doc for iframe preview (like online HTML viewers)
  // NOTE: We include basic styling to make headings/lists readable.
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 16px; line-height: 1.5; }
  h1,h2,h3 { margin: 0.9em 0 0.4em; }
  ul { margin: 0.4em 0 0.8em 1.2em; }
  li { margin: 0.25em 0; }
</style>
</head>
<body>
${innerHtml || ""}
</body>
</html>`;
}

export default function DescribeOutput() {
  const { result } = useLastResult();
  const [tab, setTab] = useState<
    | "overview"
    | "features"
    | "specs"
    | "links"
    | "manuals"
    | "seo"
    | "json"
  >("overview");

  const [viewMode, setViewMode] = useState<"styled" | "iframe">("iframe");

  useEffect(() => {
    setTab("overview");
  }, [result]);

  const descriptionHtml = result?.descriptionHtml ?? "";
  const sections = result?.sections ?? {};
  const seo = result?.seo ?? {};

  const tabHtml = useMemo(() => {
    switch (tab) {
      case "overview":
        // IMPORTANT: overview tab should show the FULL HTML (not sections.overview)
        return descriptionHtml || sections.overview || "";
      case "hook":
        return sections.hook || "";
      case "main":
        return sections.mainDescription || "";
      case "features":
        return sections.featuresBenefits || "";
      case "specs":
        return sections.specifications || "";
      case "links":
        return sections.internalLinks || "";
      case "why":
        return sections.whyChoose || "";
      case "manuals":
        return sections.manuals || sections.manualsSectionHtml || "";
      case "faqs":
        return sections.faqs || "";
      default:
        return "";
    }
  }, [tab, descriptionHtml, sections]);

  function copyCurrentHtml() {
    const toCopy = tabHtml || "";
    navigator.clipboard.writeText(toCopy).then(() => alert("Tab HTML copied to clipboard"));
  }

  function copyFullHtml() {
    navigator.clipboard.writeText(descriptionHtml || "").then(() => alert("Full HTML copied to clipboard"));
  }

  function copySeoMeta() {
    const h1 = seo.h1 ?? "";
    const title = seo.pageTitle ?? seo.title ?? "";
    const metaDescription = seo.metaDescription ?? "";
    const keywords =
      Array.isArray(seo.keywords) ? seo.keywords.join(", ") : (seo.keywords ?? "");

    const text = [
      `H1: ${h1}`,
      `Page Title: ${title}`,
      `Meta Description: ${metaDescription}`,
      `Search Keywords: ${keywords}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => alert("SEO metadata copied to clipboard"));
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
    sessionStorage.setItem("avidia:import:payload", JSON.stringify(result ?? {}));
    window.location.href = "/dashboard/import";
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "features", label: "Features" },
    { id: "specs", label: "Specs" },
    { id: "links", label: "Links" },
    { id: "manuals", label: "Manuals" },
    { id: "seo", label: "SEO" },
    { id: "json", label: "Raw JSON" },
  ] as const;

  if (!result) {
    return (
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <div className="text-sm text-slate-500">No generated description yet. Fill the form and click Generate.</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Preview</h2>
          <div className="text-xs text-slate-500">
            Source: {result?.normalizedPayload?.source ?? "Describe"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyCurrentHtml} className="px-3 py-1 border rounded text-sm">
            Copy Tab HTML
          </button>
          <button onClick={copyFullHtml} className="px-3 py-1 border rounded text-sm">
            Copy Full HTML
          </button>
          <button onClick={copySeoMeta} className="px-3 py-1 border rounded text-sm">
            Copy SEO Meta
          </button>
          <button onClick={downloadJSON} className="px-3 py-1 border rounded text-sm">
            Download JSON
          </button>
          <button onClick={sendToImport} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">
            Send to Import
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 border-b pb-3 mb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`text-sm ${
              tab === t.id ? "font-semibold text-slate-900 dark:text-slate-50" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">View:</span>
          <button
            onClick={() => setViewMode("styled")}
            className={`text-xs px-2 py-1 border rounded ${viewMode === "styled" ? "font-semibold" : ""}`}
          >
            Styled
          </button>
          <button
            onClick={() => setViewMode("iframe")}
            className={`text-xs px-2 py-1 border rounded ${viewMode === "iframe" ? "font-semibold" : ""}`}
          >
            HTML Viewer
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "seo" ? (
        <div className="space-y-3 text-sm">
          <div><strong>H1:</strong> {seo.h1 || <em className="text-slate-500">Not available</em>}</div>
          <div><strong>Page Title:</strong> {(seo.pageTitle ?? seo.title) || <em className="text-slate-500">Not available</em>}</div>
          <div>
            <strong>Meta Description:</strong>
            <div className="mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {seo.metaDescription || <em className="text-slate-500">Not available</em>}
            </div>
          </div>
          <div>
            <strong>Search Keywords:</strong>
            <div className="mt-1 text-slate-600 dark:text-slate-300">
              {Array.isArray(seo.keywords) ? seo.keywords.join(", ") : (seo.keywords ?? <em className="text-slate-500">Not available</em>)}
            </div>
          </div>
        </div>
      ) : tab === "json" ? (
        <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : viewMode === "iframe" ? (
        <iframe
          title="HTML Preview"
          className="w-full min-h-[520px] rounded border bg-white"
          sandbox=""
          srcDoc={htmlDoc(tabHtml)}
        />
      ) : (
        <div
          className="prose prose-slate max-w-none dark:prose-invert prose-h2:mt-5 prose-h3:mt-4 prose-li:my-0.5"
          dangerouslySetInnerHTML={{ __html: tabHtml || "<em>No content available for this tab yet.</em>" }}
        />
      )}
    </div>
  );
}
