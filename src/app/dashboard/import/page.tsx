"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploader from "@/components/imports/ImportUploader";
import ConnectorManager from "@/components/integrations/ConnectorManager";

/**
 * Modernized Dashboard Import page
 *
 * - Adds a platform selector (BigCommerce default) and a tabbed Upload vs Connectors UI.
 * - Reuses ImportUploader and ConnectorManager components added earlier.
 * - Preserves the pipeline run / telemetry UI.
 *
 * Notes:
 * - Platform selection affects labels and can be used to pick a mapping preset later.
 * - Keep server-side enforcement of limits and authentication in your API routes.
 */

type AnyObj = Record<string, any>;

type PipelineRunStatus = "queued" | "running" | "succeeded" | "failed";
type ModuleRunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

type PipelineModule = {
  id?: string;
  module_index: number;
  module_name: string;
  status: ModuleRunStatus;
  started_at?: string | null;
  finished_at?: string | null;
  output_ref?: string | null;
  error?: any;
};

type PipelineSnapshot = {
  run?: { id: string; status: PipelineRunStatus; created_at?: string; started_at?: string; finished_at?: string } & AnyObj;
  modules?: PipelineModule[];
};

type ImportMode = "full" | "import_only";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function fmtMs(ms: number | null) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}
function statusChipClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "running") return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-500/40";
  if (s === "failed") return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-500/40";
  if (s === "succeeded" || s === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500/40";
  if (s === "skipped") return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800";
}
function moduleLabel(name: string) {
  switch (name) {
    case "extract":
      return "Extract";
    case "seo":
      return "SEO";
    case "audit":
      return "Audit";
    case "import":
      return "Import";
    case "monitor":
      return "Monitor";
    case "price":
      return "Price";
    default:
      return name;
  }
}
function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";

  // Connector / import platform selection
  const [platform, setPlatform] = useState<string>("bigcommerce"); // default
  const [activeTab, setActiveTab] = useState<"upload" | "connectors">("upload");

  // BigCommerce connection UI state / pipeline controls
  const [ingestionIdInput, setIngestionIdInput] = useState(ingestionIdParam || "");
  const [importMode, setImportMode] = useState<ImportMode>("full");
  const [allowOverwriteExisting, setAllowOverwriteExisting] = useState(false);

  // Runtime states / pipeline telemetry
  const [job, setJob] = useState<any | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string>(pipelineRunIdParam || "");
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [importArtifact, setImportArtifact] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Minimal fetch helpers preserved from prior implementation
  async function fetchIngestion(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
      const row = json?.data ?? json;
      setJob(row);
      return row;
    } finally {
      setLoading(false);
    }
  }
  async function fetchPipelineSnapshot(runId: string) {
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`);
    return json as PipelineSnapshot;
  }
  async function pollPipeline(runId: string, timeoutMs = 300_000, intervalMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);
      const s = snap?.run?.status;
      if (s === "succeeded" || s === "failed") return snap;
      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }
  async function fetchImportArtifact(runId: string, modules?: PipelineModule[]) {
    const importMod = (modules ?? []).find((m) => m.module_name === "import");
    if (!importMod) return null;
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}/output/${importMod.module_index}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || json?.error || `Import artifact fetch failed: ${res.status}`);
    setImportArtifact(json);
    return json;
  }

  async function runImport() {
    if (running) return;
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);
    setImportArtifact(null);

    const id = ingestionIdInput.trim();
    if (!id) {
      setError("Enter an ingestionId first.");
      return;
    }

    setRunning(true);
    try {
      setStatusMessage("Loading ingestion");
      await fetchIngestion(id);

      const steps = importMode === "import_only" ? ["import"] : ["extract", "seo", "audit", "import"];

      setStatusMessage("Starting pipeline run");
      const res = await fetch("/api/v1/pipeline/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ingestionId: id,
          triggerModule: "import",
          steps,
          options: {
            import: {
              platform,
              allowOverwriteExisting,
            },
          },
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `Pipeline start failed: ${res.status}`);

      const runId = String(json?.pipelineRunId ?? "");
      if (!runId) throw new Error("Pipeline start did not return pipelineRunId");

      setPipelineRunId(runId);
      router.push(`/dashboard/import?ingestionId=${encodeURIComponent(id)}&pipelineRunId=${encodeURIComponent(runId)}`);

      setStatusMessage("Pipeline running");
      const snap = await pollPipeline(runId, 300_000, 2000);

      setStatusMessage("Refreshing ingestion");
      await fetchIngestion(id);

      setStatusMessage("Loading import artifact");
      await fetchImportArtifact(runId, snap?.modules ?? []);

      setStatusMessage("Import run completed");
    } catch (e: any) {
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setRunning(false);
    }
  }

  // Initial loads
  useEffect(() => {
    if (ingestionIdParam) {
      fetchIngestion(ingestionIdParam).catch((e) => setError(String((e as any)?.message || e)));
    }
    if (pipelineRunIdParam) {
      (async () => {
        try {
          const snap = await fetchPipelineSnapshot(pipelineRunIdParam);
          setPipelineSnapshot(snap);
          setPipelineRunId(pipelineRunIdParam);
          await fetchImportArtifact(pipelineRunIdParam, snap?.modules ?? []);
        } catch (e: any) {
          setError(String(e?.message || e));
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobData = useMemo(() => {
    if (!job) return null;
    if ((job as any)?.data?.data) return (job as any).data.data;
    if ((job as any)?.data) return (job as any).data;
    return job;
  }, [job]);

  const auditDiag = jobData?.diagnostics?.audit ?? null;
  const auditStatus = typeof auditDiag?.status === "string" ? auditDiag.status : null;
  const auditScore = typeof auditDiag?.score === "number" ? auditDiag.score : null;

  const importDiag = jobData?.diagnostics?.import ?? null;
  const importResult = importDiag?.result ?? null;

  const runStatus = pipelineSnapshot?.run?.status ?? null;

  const moduleRuntime = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of pipelineSnapshot?.modules ?? []) {
      if (m.started_at && m.finished_at) {
        const ms = new Date(m.finished_at).getTime() - new Date(m.started_at).getTime();
        if (!Number.isNaN(ms) && ms >= 0) map.set(m.module_name, ms);
      }
    }
    return map;
  }, [pipelineSnapshot]);

  const progress = useMemo(() => {
    const mods = pipelineSnapshot?.modules ?? [];
    if (!mods.length) return 0;
    const done = mods.filter((m) => ["succeeded", "failed", "skipped"].includes(m.status)).length;
    return Math.round((done / mods.length) * 100);
  }, [pipelineSnapshot]);

  const importAction = importResult?.action ?? importArtifact?.output?.import?.result?.action ?? null;
  const importNeedsReview = Boolean(importResult?.needs_review ?? importArtifact?.output?.import?.result?.needs_review);

  const topInfo = (() => {
    if (!pipelineRunId) return "Idle";
    if (running || runStatus === "running") return "Running…";
    return `Run ${pipelineRunId.slice(0, 8)}…`;
  })();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8 lg:py-6 space-y-4">
        {/* Top bar */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              AvidiaImport
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded px-2 py-1 border text-sm"
                aria-label="Select import platform"
              >
                <option value="bigcommerce">BigCommerce (default)</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="magento">Magento</option>
                <option value="squarespace">Squarespace</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">{topInfo}</div>
        </section>

        {/* Main grid: left = uploader/connectors, right = run controls + telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-950/60">
            {/* Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`px-3 py-2 rounded ${activeTab === "upload" ? "bg-slate-900 text-white" : "bg-white border"}`}
                >
                  Upload file
                </button>
                <button
                  onClick={() => setActiveTab("connectors")}
                  className={`px-3 py-2 rounded ${activeTab === "connectors" ? "bg-slate-900 text-white" : "bg-white border"}`}
                >
                  Connectors
                </button>
              </div>
              <div className="text-xs text-slate-500">Bucket: imports</div>
            </div>

            <div className="mt-4">
              {activeTab === "upload" ? (
                <div>
                  <div className="text-sm font-medium">Upload import file</div>
                  <div className="text-xs text-slate-500 mb-3">CSV or Excel (.xlsx, .xls). Max rows: 5000, Max columns: 50.</div>

                  <ImportUploader
                    bucket="imports"
                    onCreated={(jobId) => {
                      if (jobId) {
                        setIngestionIdInput(jobId);
                        setStatusMessage(`Import job created: ${jobId}. You can now run the pipeline.`);
                        fetchIngestion(jobId).catch(() => null);
                      } else {
                        setStatusMessage("Import created.");
                      }
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium">Connectors</div>
                  <div className="text-xs text-slate-500 mb-3">Create and manage platform connections. Use "Sync now" to pull data into an import job.</div>

                  {/* Pass orgId later: replace with real org id from session when available */}
                  <ConnectorManager orgId={""} />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Run import panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-950/60">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Run Import (pipeline)</h3>
                  <p className="text-xs text-slate-500 mt-1">Run pipeline: extract → seo → audit → import. Or choose import only.</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${statusChipClass(runStatus ?? "idle")}`}>
                  {runStatus ?? "idle"}
                </span>
              </div>

              {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-medium uppercase text-slate-500">ingestionId</label>
                  <input
                    value={ingestionIdInput}
                    onChange={(e) => setIngestionIdInput(e.target.value)}
                    placeholder="ingestion / import id"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <select value={importMode} onChange={(e) => setImportMode(e.target.value as ImportMode)} className="rounded border px-2 py-1 text-sm">
                      <option value="full">extract + seo + audit + import</option>
                      <option value="import_only">import only</option>
                    </select>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                      <span className="text-[11px]">Allow overwrite existing SKU</span>
                    </label>
                  </div>

                  <div className="w-36">
                    <button onClick={runImport} disabled={running} className="w-full px-3 py-2 rounded bg-sky-500 text-white">
                      {running ? "Running…" : "Run Import"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Audit</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="font-mono">{typeof auditScore === "number" ? `${auditScore}/100` : "—"}</div>
                    <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusChipClass(auditStatus ?? "unknown")}`}>
                      {auditStatus ?? "unknown"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Import action</div>
                  <div className="mt-1 font-semibold">{importAction ?? "—"}</div>
                  {importNeedsReview && <div className="mt-1 text-amber-700 text-sm">Needs review: SKU exists and overwrite is disabled.</div>}
                </div>
              </div>
            </div>

            {/* Live pipeline + artifact viewer */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Live pipeline</h4>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${statusChipClass(runStatus ?? "idle")}`}>{runStatus ?? "idle"}</span>
              </div>

              <div className="mt-3 space-y-2">
                {(pipelineSnapshot?.modules ?? []).slice().sort((a, b) => a.module_index - b.module_index).map((m) => (
                  <div key={`${m.module_index}-${m.module_name}`} className="flex items-center justify-between rounded p-2 border">
                    <div>
                      <div className="font-medium">{m.module_index}. {moduleLabel(m.module_name)}</div>
                      <div className="text-xs text-slate-500">output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span></div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusChipClass(m.status)}`}>{m.status}</div>
                      <div className="text-xs mt-1">{fmtMs(moduleRuntime.get(m.module_name) ?? null)}</div>
                    </div>
                  </div>
                ))}

                {!pipelineSnapshot?.modules?.length && <div className="text-xs text-slate-500">No pipeline run selected yet.</div>}
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-500">Raw artifact</div>
                <pre className="mt-2 max-h-[260px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-slate-50">
                  {importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see output JSON."}
                </pre>
                <div className="mt-2 text-right">
                  <button onClick={() => downloadJson(`import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, { ingestionId: jobData?.id ?? ingestionIdInput ?? null, pipelineRunId: pipelineRunId || null, diagnostics_import: importDiag ?? null, import_artifact: importArtifact ?? null })} className="text-xs px-2 py-1 bg-slate-900 text-white rounded">
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </main>
  );
}
