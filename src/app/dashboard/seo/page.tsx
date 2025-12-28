// src/app/dashboard/seo/page.tsx
// Premium overhaul of the SEO dashboard — hybrid of Monitor / Extract / Describe.
// - No "Run Quick SEO" button (removed as requested).
// - Inputs visible in hero: ingestionId / paste URL / pick a job
// - Live preview canvas (left) shows DescribeOutput (HTML + structured payload preview).
// - Right rail provides JSON viewer, pipeline snapshot, quick links to Monitor/Extract/Describe.
// - Pipeline run control is deliberate (Run SEO) and requires an ingestionId to avoid accidental runs.
// - Reuses existing components where available (DescribeOutput, JsonViewer, TabsShell).
//
// Drop this file into src/app/dashboard/seo/page.tsx to replace the existing SEO dashboard.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DescribeOutput from "@/components/describe/DescribeOutput";
import JsonViewer from "@/components/JsonViewer";
import TabsShell from "@/components/TabsShell";
import { useIngestRow } from "@/hooks/useIngestRow";
import { useToast } from "@/components/ui/toast";
import ModuleLogsModal from "@/components/pipeline/ModuleLogsModal";

export const dynamic = "force-dynamic";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* Small shared UI bits (kept in-file to avoid extra imports) */
function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal" | "brand";
}) {
  const tones =
    tone === "brand"
      ? "border-fuchsia-200/60 bg-fuchsia-50 text-fuchsia-700"
      : tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700"
      : "border-slate-200/70 bg-white/75 text-slate-600";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] shadow-sm",
        tones
      )}
    >
      {children}
    </span>
  );
}

function SoftButton({
  onClick,
  href,
  children,
  variant = "secondary",
  className,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  if (variant === "primary") {
    const node = (
      <button onClick={onClick} className={cx(base, "bg-gradient-to-r from-fuchsia-400 via-pink-500 to-sky-500 text-white", className)}>
        {children}
      </button>
    );
    if (href) return <a href={href}>{node}</a>;
    return node;
  }

  const node = (
    <button onClick={onClick} className={cx(base, "border border-slate-200/80 bg-white/70 text-slate-700", className)}>
      {children}
    </button>
  );
  if (href) return <a href={href}>{node}</a>;
  return node;
}

function StatCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: React.ReactNode;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-700">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {caption ? <div className="mt-1 text-[11px] text-slate-500">{caption}</div> : null}
    </div>
  );
}

/* Page component */
export default function SeoDashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const ingestionIdParam = params?.get("ingestionId") ?? "";
  const [ingestionIdInput, setIngestionIdInput] = useState<string>(ingestionIdParam || "");
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null);
  const [pipelineSnapshot, setPipelineSnapshot] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [moduleLogsOpen, setModuleLogsOpen] = useState(false);
  const [moduleLogsParams, setModuleLogsParams] = useState<{ runId: string; index: number } | null>(null);

  // ingest row hook fetches ingestion / preview row
  const { row, loading: rowLoading, error: rowError } = useIngestRow(ingestionIdInput || null, 1500);

  const jobData = useMemo(() => {
    if (!row) return null;
    if ((row as any)?.data?.data) return (row as any).data.data;
    if ((row as any)?.data) return (row as any).data;
    return row;
  }, [row]);

  const descriptionHtml = jobData?.description_html ?? jobData?.descriptionHtml ?? "";
  const seoPayload = jobData?.seo_payload ?? jobData?.seo ?? null;
  const features = jobData?.features ?? seoPayload?.features ?? [];

  async function fetchPipelineSnapshot(runId: string) {
    try {
      const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to load pipeline ${res.status}`);
      setPipelineSnapshot(json);
      return json;
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
      return null;
    }
  }

  async function runSeoPipeline() {
    if (!ingestionIdInput) {
      toast.error("Enter an ingestionId first.");
      return;
    }
    setRunning(true);
    try {
      setPipelineSnapshot(null);
      toast.info("Starting SEO pipeline…");

      const res = await fetch("/api/v1/pipeline/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ingestionId: ingestionIdInput,
          triggerModule: "seo",
          steps: ["seo", "audit", "import"],
          options: {},
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.pipelineRunId) throw new Error(json?.error || "Failed to start pipeline");
      const runId = String(json.pipelineRunId);
      setPipelineRunId(runId);
      router.push(`/dashboard/seo?ingestionId=${encodeURIComponent(ingestionIdInput)}&pipelineRunId=${encodeURIComponent(runId)}`);
      toast.info("Pipeline started — polling status");
      await pollPipeline(runId);
      toast.success("Pipeline finished (see modules)");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setRunning(false);
    }
  }

  async function pollPipeline(runId: string, timeoutMs = 300_000, intervalMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      const status = snap?.run?.status;
      if (status === "succeeded" || status === "failed") return snap;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    toast.error("Pipeline did not complete within timeout");
    throw new Error("timeout");
  }

  useEffect(() => {
    if (!pipelineRunId) {
      const p = params?.get("pipelineRunId");
      if (p) setPipelineRunId(p);
      return;
    }
    // fetch snapshot once when pipelineRunId becomes available
    fetchPipelineSnapshot(pipelineRunId).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineRunId]);

  function openModuleLogs(index: number) {
    if (!pipelineRunId) {
      toast.error("No pipeline run selected");
      return;
    }
    setModuleLogsParams({ runId: pipelineRunId, index });
    setModuleLogsOpen(true);
  }

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background decorative */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-fuchsia-300/18 blur-3xl dark:bg-fuchsia-500/12" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-sky-300/18 blur-3xl dark:bg-sky-500/12" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10 lg:px-8 space-y-6">
        {/* HERO */}
        <section className="rounded-2xl bg-gradient-to-r from-fuchsia-200/50 via-pink-100 to-sky-100 p-[1px] shadow-xl">
          <div className="rounded-[20px] bg-white/90 p-5 dark:bg-slate-950/50 dark:border-slate-800 border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  SEO Studio — premium pipeline control & preview
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                  Produce store-ready product pages with consistent SEO metadata, structured sections,
                  and compliance-safe content. Start with an ingestionId (from Extract/Import) or paste a URL.
                </p>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <TinyChip tone="brand">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                    SEO • Instructioned
                  </TinyChip>
                  <TinyChip tone="success">Audit integrated</TinyChip>
                  <TinyChip tone="signal">Preview + JSON</TinyChip>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {/* Links to other dashboards */}
                <SoftButton href="/dashboard/monitor" variant="secondary" className="text-xs">
                  Open Monitor
                </SoftButton>
                <SoftButton href="/dashboard/extract" variant="secondary" className="text-xs">
                  Open Extract
                </SoftButton>
                <SoftButton href="/dashboard/describe" variant="secondary" className="text-xs">
                  Open Describe
                </SoftButton>
              </div>
            </div>

            {/* Inputs */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <label className="text-xs font-medium uppercase text-slate-600">Ingestion ID</label>
                <input
                  value={ingestionIdInput}
                  onChange={(e) => setIngestionIdInput(e.target.value)}
                  placeholder="Paste ingestionId (from Extract/Import) or leave blank to browse"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm focus:ring-2 focus:ring-fuchsia-300"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Tip: extraction yields the normalized payload the SEO pipeline consumes.
                </div>
              </div>

              <div className="sm:col-span-5 flex gap-2 items-end justify-end">
                {/* Removed 'Run Quick SEO' button as requested */}
                <SoftButton onClick={async () => {
                  // Navigate to extract page for users who don't have an ingestion id yet
                  router.push("/dashboard/extract");
                }} variant="secondary">
                  Browse extractions
                </SoftButton>

                <SoftButton onClick={runSeoPipeline} variant="primary" className="ml-1" >
                  {running ? "Running…" : "Run SEO pipeline"}
                </SoftButton>
              </div>
            </div>
          </div>
        </section>

        {/* WORKSPACE */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT: Live preview canvas */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TinyChip tone="success">Live canvas</TinyChip>
                    <h2 className="text-lg font-semibold">Preview — what ships</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Structured HTML + sections, identical to what AvidiaSEO will persist.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">Ingestion:</div>
                  <div className="font-mono text-xs">{ingestionIdInput || "—"}</div>
                </div>
              </div>

              <div className="mt-4 min-h-[260px]">
                {/* DescribeOutput includes the preview canvas (HTML styled viewer) */}
                <DescribeOutput />
              </div>

              {/* compact stats row */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard title="SEO generated" value={jobData ? "Yes" : "—"} caption="Has seo_payload" />
                <StatCard title="Audit score" value={jobData?.diagnostics?.seo?.audit_score ?? "—"} caption="From desc_audit" />
                <StatCard title="Sections" value={jobData ? Object.keys(jobData?.sections ?? {}).length : "—"} caption="Rendered sections" />
                <StatCard title="Feature bullets" value={Array.isArray(features) ? features.length : "—"} caption="Count" />
              </div>
            </div>

            {/* Canvas bottom area: tabs with raw / normalized */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Extraction & SEO artifacts</h3>
                <div className="text-xs text-slate-500">{rowLoading ? "Loading…" : row ? "Row loaded" : "No row"}</div>
              </div>

              <div className="mt-3">
                <TabsShell job={row} loading={rowLoading} error={rowError} noDataMessage="Load an ingestion to inspect artifacts" />
              </div>
            </div>
          </div>

          {/* RIGHT: JSON viewer, pipeline, quick controls */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Normalized JSON</h3>
                  <p className="mt-1 text-xs text-slate-500">Exact payload consumed by SEO & downstream modules</p>
                </div>
                <TinyChip>Payload</TinyChip>
              </div>

              <div className="mt-3">
                <JsonViewer data={jobData ?? {}} loading={!row && !!ingestionIdInput && rowLoading} />
              </div>

              <div className="mt-3 flex gap-2">
                <SoftButton href="/dashboard/extract" variant="secondary" className="text-xs">Open Extract</SoftButton>
                <SoftButton href="/dashboard/describe" variant="secondary" className="text-xs">Open Describe</SoftButton>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Pipeline snapshot</h3>
                  <p className="mt-1 text-xs text-slate-500">Recent run status & module outputs</p>
                </div>
                <div className="text-xs text-slate-500">{pipelineSnapshot?.run?.status ?? "—"}</div>
              </div>

              <div className="mt-3">
                {pipelineSnapshot?.modules?.length ? (
                  <div className="space-y-2">
                    {pipelineSnapshot.modules.map((m: any) => (
                      <div key={`${m.module_index}-${m.module_name}`} className="rounded-lg border border-slate-100 p-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{m.module_index}. {m.module_name}</div>
                          <div className="text-xs text-slate-500">status: {m.status} • output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span></div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={cx("text-xs rounded-full px-2 py-0.5", m.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : m.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>
                            {m.status}
                          </div>
                          <button onClick={() => openModuleLogs(m.module_index)} className="text-xs text-slate-600 hover:underline">View logs</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No pipeline run selected — run the pipeline to view modules.</div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    if (!pipelineRunId) return toast.error("No run selected");
                    fetchPipelineSnapshot(pipelineRunId).then(() => toast.info("Snapshot refreshed")).catch(() => null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white"
                >
                  Refresh snapshot
                </button>
                <button
                  onClick={() => {
                    if (!pipelineRunId) return toast.error("No run selected");
                    router.push(`/dashboard/import?pipelineRunId=${encodeURIComponent(pipelineRunId)}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1 text-xs"
                >
                  Open run
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Quality checklist</h3>
                </div>
                <TinyChip tone="signal">Audit</TinyChip>
              </div>

              <ul className="mt-3 text-xs space-y-2 text-slate-600">
                <li>H1 present & human readable</li>
                <li>Page title & meta description within sensible lengths</li>
                <li>Overview matches description HTML</li>
                <li>Specifications include at least one bullet</li>
                <li>No placeholder tokens present</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>

      {/* Module logs modal */}
      {moduleLogsParams && (
        <ModuleLogsModal
          open={moduleLogsOpen}
          runId={moduleLogsParams.runId}
          moduleIndex={moduleLogsParams.index}
          onClose={() => setModuleLogsOpen(false)}
        />
      )}
    </main>
  );
}
