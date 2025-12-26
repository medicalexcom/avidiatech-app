// DescribeOutput.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

function stripScripts(html: string) {
  if (!html) return "";
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

function htmlDoc(innerHtml: string, token: string) {
  // iframe doc that reports its height to parent so the parent can size iframe
  // and keep ONLY ONE vertical scroll (the content area in DescribeOutput).
  const safe = stripScripts(innerHtml || "");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin:0; padding:0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    padding: 16px;
    line-height: 1.5;
  }
  h1,h2,h3 { margin: 0.9em 0 0.4em; }
  ul { margin: 0.4em 0 0.8em 1.2em; }
  li { margin: 0.25em 0; }
</style>
</head>
<body>
${safe}
<script>
(function(){
  var TOKEN = ${JSON.stringify(token)};
  function postHeight(){
    try {
      var h = Math.max(
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.body ? document.body.scrollHeight : 0
      );
      parent.postMessage({ type: "avidia:describe:iframeHeight", token: TOKEN, height: h }, "*");
    } catch(e) {}
  }

  // Post multiple times as layout settles
  window.addEventListener("load", function(){
    postHeight();
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 220);
    setTimeout(postHeight, 500);
  });

  // Observe DOM changes to keep height accurate for long/complex HTML
  try {
    var mo = new MutationObserver(function(){ postHeight(); });
    mo.observe(document.body, { childList:true, subtree:true, characterData:true });
  } catch(e) {}

  window.addEventListener("resize", postHeight);
})();
</script>
</body>
</html>`;
}

export default function DescribeOutput() {
  const { result } = useLastResult();

  const [tab, setTab] = useState<
    | "overview"
    | "hook"
    | "main"
    | "features"
    | "specs"
    | "links"
    | "why"
    | "manuals"
    | "faqs"
    | "seo"
    | "json"
  >("overview");

  // ✅ HTML Viewer default
  const [viewMode, setViewMode] = useState<"styled" | "iframe">("iframe");

  // iframe auto-height
  const iframeTokenRef = useRef<string>(
    `t_${Math.random().toString(36).slice(2)}_${Date.now()}`
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(720);

  useEffect(() => {
    setTab("overview");
  }, [result]);

  const descriptionHtml = result?.descriptionHtml ?? "";
  const sections = result?.sections ?? {};
  const seo = result?.seo ?? {};

  const tabHtml = useMemo(() => {
    switch (tab) {
      case "overview":
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
    navigator.clipboard
      .writeText(toCopy)
      .then(() => alert("Tab HTML copied to clipboard"));
  }

  function copyFullHtml() {
    navigator.clipboard
      .writeText(descriptionHtml || "")
      .then(() => alert("Full HTML copied to clipboard"));
  }

  function copySeoMeta() {
    const h1 = seo.h1 ?? "";
    const title = seo.pageTitle ?? seo.title ?? "";
    const metaDescription = seo.metaDescription ?? "";
    const keywords = Array.isArray(seo.keywords)
      ? seo.keywords.join(", ")
      : seo.keywords ?? "";

    const text = [
      `H1: ${h1}`,
      `Page Title: ${title}`,
      `Meta Description: ${metaDescription}`,
      `Search Keywords: ${keywords}`,
    ].join("\n");

    navigator.clipboard
      .writeText(text)
      .then(() => alert("SEO metadata copied to clipboard"));
  }

  function downloadJSON() {
    const data = result ?? {};
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
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

  // Listen for iframe height reports (one vertical scroll = content area only)
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d: any = e.data;
      if (!d || d.type !== "avidia:describe:iframeHeight") return;
      if (d.token !== iframeTokenRef.current) return;

      const next = Number(d.height);
      if (!Number.isFinite(next) || next <= 0) return;

      // add a tiny buffer so bottom isn't clipped
      const buffered = Math.max(200, Math.ceil(next) + 8);

      setIframeHeight((prev) => {
        // avoid jitter
        if (Math.abs(prev - buffered) < 8) return prev;
        return buffered;
      });
    }

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!result) {
    return (
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <div className="text-sm text-slate-500">
          No generated description yet. Fill the form and click Generate.
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-slate-900 border rounded-lg shadow-sm flex flex-col overflow-hidden"
      style={{ height: "clamp(600px, 80vh, 980px)" }}
    >
      {/* ✅ BAND (never scrolls) */}
      <div className="shrink-0 p-4 border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <button
              onClick={sendToImport}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Send to Import
            </button>
          </div>
        </div>

        {/* Tabs + View (still in the non-scrolling band) */}
        <div className="mt-3 flex flex-wrap gap-3 items-center border-t pt-3">
          <div className="flex flex-wrap gap-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`text-sm ${
                  tab === t.id
                    ? "font-semibold text-slate-900 dark:text-slate-50"
                    : "text-slate-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">View:</span>
            <button
              onClick={() => setViewMode("styled")}
              className={`text-xs px-2 py-1 border rounded ${
                viewMode === "styled" ? "font-semibold" : ""
              }`}
            >
              Styled
            </button>
            <button
              onClick={() => setViewMode("iframe")}
              className={`text-xs px-2 py-1 border rounded ${
                viewMode === "iframe" ? "font-semibold" : ""
              }`}
            >
              HTML Viewer
            </button>
          </div>
        </div>
      </div>

      {/* ✅ CONTENT (the ONLY vertical scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === "seo" ? (
          <div className="space-y-3 text-sm">
            <div>
              <strong>H1:</strong>{" "}
              {seo.h1 || <em className="text-slate-500">Not available</em>}
            </div>
            <div>
              <strong>Page Title:</strong>{" "}
              {(seo.pageTitle ?? seo.title) || (
                <em className="text-slate-500">Not available</em>
              )}
            </div>
            <div>
              <strong>Meta Description:</strong>
              <div className="mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {seo.metaDescription || (
                  <em className="text-slate-500">Not available</em>
                )}
              </div>
            </div>
            <div>
              <strong>Search Keywords:</strong>
              <div className="mt-1 text-slate-600 dark:text-slate-300">
                {Array.isArray(seo.keywords)
                  ? seo.keywords.join(", ")
                  : seo.keywords ?? <em className="text-slate-500">Not available</em>}
              </div>
            </div>
          </div>
        ) : tab === "json" ? (
          // ✅ one vertical scroll only: this pre does NOT add overflow-y auto
          <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : viewMode === "iframe" ? (
          <iframe
            ref={iframeRef}
            title="HTML Preview"
            className="w-full rounded border bg-white"
            style={{ height: iframeHeight }}
            // allow-scripts is needed for the internal height reporter
            sandbox="allow-scripts"
            srcDoc={htmlDoc(tabHtml, iframeTokenRef.current)}
          />
        ) : (
          <div
            className="prose prose-slate max-w-none dark:prose-invert prose-h2:mt-5 prose-h3:mt-4 prose-li:my-0.5"
            dangerouslySetInnerHTML={{
              __html: tabHtml || "<em>No content available for this tab yet.</em>",
            }}
          />
        )}
      </div>
    </div>
  );
}
