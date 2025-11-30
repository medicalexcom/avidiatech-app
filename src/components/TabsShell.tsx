"use client";

import React from "react";

type TabsShellProps = {
  job: any;
  loading?: boolean;
  error?: any;
  noDataMessage?: string;
};

/**
 * TabsShell for the Extract page.
 *
 * Responsibility:
 * - Show deeper / technical details that complement the high-level preview:
 *   - Source SEO (scraped only, NOT AvidiaSEO)
 *   - Specs
 *   - Variants
 *   - Raw JSON / payload
 *   - Diagnostics
 *
 * The high-level "preview" card above this component owns:
 *   - Overview / description
 *   - Features
 *   - Images
 *   - Manuals / PDFs
 *
 * That separation avoids duplicate content on the screen.
 */
export default function TabsShell({
  job,
  loading,
  error,
  noDataMessage,
}: TabsShellProps) {
  const payload = job?.normalized_payload || job?.raw_payload || job || null;

  const hasSourceSeo = !!payload?.source_seo;
  const hasSpecs =
    !!payload?.specs_json || !!payload?.specs || !!payload?.specs_payload;
  const hasVariants =
    Array.isArray(payload?.variants) && payload.variants.length > 0;

  const rawJsonSource =
    payload?.normalized_payload ??
    payload?.raw_payload ??
    payload ??
    null;
  const hasRaw = !!rawJsonSource;

  const diagnostics = job?.diagnostics || payload?.diagnostics || null;
  const hasDiagnostics =
    diagnostics && Object.keys(diagnostics).length > 0;

  // Handle outer states
  if (!job && !loading) {
    return <div>{noDataMessage}</div>;
  }

  if (loading && !job) {
    return <div>Waiting for engine to complete…</div>;
  }

  if (error) {
    return <div style={{ color: "crimson" }}>{String(error)}</div>;
  }

  // Build tab model (only advanced / non-duplicated sections)
  const TAB_SOURCE_SEO = "source_seo";
  const TAB_SPECS = "specs";
  const TAB_VARIANTS = "variants";
  const TAB_RAW = "raw";
  const TAB_DIAGNOSTICS = "diagnostics";

  const tabs = [
    { id: TAB_SOURCE_SEO, label: "Source SEO", enabled: hasSourceSeo },
    { id: TAB_SPECS, label: "Specs", enabled: hasSpecs },
    { id: TAB_VARIANTS, label: "Variants", enabled: hasVariants },
    { id: TAB_RAW, label: "Raw JSON", enabled: hasRaw },
    { id: TAB_DIAGNOSTICS, label: "Diagnostics", enabled: true },
  ] as const;

  // Pick initial tab: first enabled, otherwise Raw, otherwise Diagnostics.
  const firstEnabled =
    tabs.find((t) => t.enabled)?.id || TAB_RAW || TAB_DIAGNOSTICS;

  const [activeTab, setActiveTab] =
    React.useState<string>(firstEnabled);

  // When job changes, reset to first enabled tab
  React.useEffect(() => {
    const nextFirst =
      tabs.find((t) => t.enabled)?.id || TAB_RAW || TAB_DIAGNOSTICS;
    setActiveTab(nextFirst);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSourceSeo, hasSpecs, hasVariants, hasRaw]);

  return (
    <div className="mt-4">
      {/* Tab headers */}
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const baseClasses =
            "px-3 py-1.5 text-sm rounded border transition-colors";
          const activeClasses =
            "bg-slate-900 text-white border-slate-900";
          const inactiveClasses = tab.enabled
            ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed";

          return (
            <button
              key={tab.id}
              type="button"
              disabled={!tab.enabled}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              className={`${baseClasses} ${
                isActive ? activeClasses : inactiveClasses
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="border rounded-md p-3 bg-slate-50 text-sm overflow-x-auto">
        {activeTab === TAB_SOURCE_SEO && (
          <SourceSeoPanel payload={payload} hasSourceSeo={hasSourceSeo} />
        )}

        {activeTab === TAB_SPECS && (
          <SpecsPanel payload={payload} hasSpecs={hasSpecs} />
        )}

        {activeTab === TAB_VARIANTS && (
          <VariantsPanel payload={payload} hasVariants={hasVariants} />
        )}

        {activeTab === TAB_RAW && (
          <RawPanel rawJsonSource={rawJsonSource} hasRaw={hasRaw} />
        )}

        {activeTab === TAB_DIAGNOSTICS && (
          <DiagnosticsPanel diagnostics={diagnostics} />
        )}
      </div>
    </div>
  );
}

/** Source SEO: scraped only, never AvidiaSEO output */
function SourceSeoPanel({
  payload,
  hasSourceSeo,
}: {
  payload: any;
  hasSourceSeo: boolean;
}) {
  if (!hasSourceSeo) {
    return (
      <div className="text-slate-500">
        No scraped SEO fields were found on the source site.
      </div>
    );
  }

  const seo = payload.source_seo || {};

  return (
    <div className="space-y-2">
      <table className="w-full text-sm border-collapse">
        <tbody>
          <SeoRow label="Source H1" value={seo.source_h1} />
          <SeoRow label="Title Tag" value={seo.source_title_tag} />
          <SeoRow
            label="Meta Description"
            value={seo.source_meta_description}
          />
          <SeoRow label="Canonical" value={seo.canonical} />
          <SeoRow label="OG Title" value={seo.og_title} />
          <SeoRow
            label="OG Description"
            value={seo.og_description}
          />
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600">
        These SEO fields were extracted from the source website. They
        are{" "}
        <strong>not generated or optimized by AvidiaTech</strong>.
      </p>
    </div>
  );
}

function SeoRow({ label, value }: { label: string; value: any }) {
  return (
    <tr className="border-b last:border-none border-slate-200">
      <td className="font-semibold p-1.5 align-top w-40 text-slate-700">
        {label}
      </td>
      <td className="p-1.5 text-slate-800">
        {value ?? <span className="text-slate-400">-</span>}
      </td>
    </tr>
  );
}

/** Specs panel */
function SpecsPanel({
  payload,
  hasSpecs,
}: {
  payload: any;
  hasSpecs: boolean;
}) {
  if (!hasSpecs) {
    return (
      <div className="text-slate-500">
        Specs not present in this extraction.
      </div>
    );
  }

  const specsPayload =
    payload.specs_json || payload.specs || payload.specs_payload;

  return (
    <pre className="bg-slate-900 text-slate-50 p-3 rounded text-xs whitespace-pre-wrap break-words">
      {JSON.stringify(specsPayload, null, 2)}
    </pre>
  );
}

/** Variants panel */
function VariantsPanel({
  payload,
  hasVariants,
}: {
  payload: any;
  hasVariants: boolean;
}) {
  if (!hasVariants) {
    return (
      <div className="text-slate-500">
        No variants detected for this product.
      </div>
    );
  }

  return (
    <pre className="bg-slate-900 text-slate-50 p-3 rounded text-xs whitespace-pre-wrap break-words">
      {JSON.stringify(payload.variants, null, 2)}
    </pre>
  );
}

/** Raw JSON / payload panel */
function RawPanel({
  rawJsonSource,
  hasRaw,
}: {
  rawJsonSource: any;
  hasRaw: boolean;
}) {
  if (!hasRaw) {
    return (
      <div className="text-slate-500">
        No raw payload available for this job.
      </div>
    );
  }

  return (
    <pre className="bg-slate-900 text-slate-50 p-3 rounded text-xs whitespace-pre-wrap break-words">
      {JSON.stringify(rawJsonSource, null, 2)}
    </pre>
  );
}

/** Diagnostics panel */
function DiagnosticsPanel({ diagnostics }: { diagnostics: any }) {
  if (!diagnostics || Object.keys(diagnostics).length === 0) {
    return (
      <div className="text-slate-500">
        No diagnostics were recorded for this extraction.
      </div>
    );
  }

  return (
    <pre className="bg-amber-950 text-amber-50 p-3 rounded text-xs whitespace-pre-wrap break-words">
      {JSON.stringify(diagnostics, null, 2)}
    </pre>
  );
}
