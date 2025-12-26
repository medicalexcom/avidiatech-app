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
  // iframe doc that reports its *content* height to parent (postMessage).
  // Parent sizes iframe so ONLY ONE vertical scroll exists: the outer content area.
  const safe = stripScripts(innerHtml || "");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<style>
  html, body { margin:0; padding:0; }
  /* Hide iframe-internal scrollbars (prevents "2 scrolls") */
  html, body { overflow: hidden; }

  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    padding: 16px;
    padding-bottom: 40px; /* small safety so last line never kisses the edge */
    line-height: 1.5;
    background: transparent;
    color: #0f172a;
  }

  /* Document-like layout (no visible frame) */
  .page {
    max-width: 920px;
    margin: 0 auto;
    padding-bottom: 16px; /* extra safety for margin-collapse / final elements */
  }

  h1,h2,h3 { margin: 0.9em 0 0.4em; }
  p { margin: 0.55em 0; }
  ul,ol { margin: 0.4em 0 0.8em 1.2em; padding: 0; }
  li { margin: 0.25em 0; }
  hr { border: 0; border-top: 1px solid rgba(226,232,240,0.9); margin: 1.25em 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid rgba(226,232,240,0.9); padding: 8px; vertical-align: top; }
  a { color: #0ea5e9; text-decoration: underline; }

  @media (prefers-color-scheme: dark) {
    body { color: #e2e8f0; }
    hr { border-top-color: rgba(51,65,85,0.9); }
    td, th { border-color: rgba(51,65,85,0.9); }
    a { color: #38bdf8; }
  }
</style>
</head>
<body>
  <div class="page">
    ${safe}
  </div>

<script>
(function(){
  var TOKEN = ${JSON.stringify(token)};

  function computeContentHeight(){
    // ✅ Measure only the actual content wrapper.
    // Avoid documentElement/body scrollHeight unless page is missing,
    // because those can "floor" to viewport height and cause blank space.
    var page = document.querySelector('.page');
    if (page) {
      var h = 0;
      try {
        h = Math.max(h, page.scrollHeight || 0);
        h = Math.max(h, page.offsetHeight || 0);
        var rect = page.getBoundingClientRect ? page.getBoundingClientRect() : null;
        if (rect && rect.height) h = Math.max(h, rect.height);
      } catch(e) {}

      // buffer for rounding + fonts + last margin
      h = Math.ceil(h) + 24;
      return Math.max(120, h);
    }

    // Fallback (only if .page missing)
    var fb = 0;
    try {
      fb = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.body ? document.body.offsetHeight : 0
      );
    } catch(e) {}
    fb = Math.ceil(fb) + 24;
    return Math.max(120, fb);
  }

  function postHeight(){
    try {
      parent.postMessage(
        { type: "avidia:describe:iframeHeight", token: TOKEN, height: computeContentHeight() },
        "*"
      );
    } catch(e) {}
  }

  function burst(){
    postHeight();
    requestAnimationFrame(postHeight);
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 180);
    setTimeout(postHeight, 360);
    setTimeout(postHeight, 700);
  }

  window.addEventListener("load", function(){ burst(); });

  // Observe DOM changes to keep height accurate
  try {
    var mo = new MutationObserver(function(){ postHeight(); });
    mo.observe(document.body, { childList:true, subtree:true, characterData:true });
  } catch(e) {}

  // ResizeObserver catches font reflow / images etc.
  try {
    var ro = new ResizeObserver(function(){ postHeight(); });
    ro.observe(document.body);
    ro.observe(document.documentElement);
  } catch(e) {}

  window.addEventListener("resize", postHeight);

  // Kick once ASAP
  burst();
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
  const [iframeHeight, setIframeHeight] = useState<number>(520);

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

  // When HTML content changes, reset height small so it can shrink immediately,
  // then let iframe report the correct content height.
  useEffect(() => {
    if (viewMode !== "iframe") return;
    setIframeHeight(520);
  }, [viewMode, tab, tabHtml]);

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

      // ✅ Keep it tight (no blank), but still safe from clipping
      const buffered = Math.max(120, Math.ceil(next));

      setIframeHeight((prev) => {
        // avoid jitter
        if (Math.abs(prev - buffered) < 6) return prev;
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
      <div className="shrink-0 p-4 border-b bg-white/90 dark:bg-slate-900/70 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold">Preview</h2>
            <div className="text-xs text-slate-500 truncate">
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
          <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : viewMode === "iframe" ? (
          <iframe
            ref={iframeRef}
            title="HTML Preview"
            className="w-full block border-0 shadow-none rounded-none bg-transparent"
            style={{ height: iframeHeight }}
            sandbox="allow-scripts"
            scrolling="no"
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
