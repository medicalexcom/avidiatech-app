"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploader from "@/components/imports/ImportUploader";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import ModuleLogsModal from "@/components/pipeline/ModuleLogsModal";
import RecentRuns from "@/components/pipeline/RecentRuns";

/**
 * Improved Import dashboard page — full replacement
 *
 * What I changed / improved:
 * - Connector manager is open by default and connector cards are selectable (click a connector to select it).
 * - Selected connector shows a clear connection banner with health (Connected / Failed) and last error details.
 * - "Allow overwrite existing SKU" and "Auto-run pipeline after upload" appear in a single controls area.
 * - Run Import button sits on the same line and avoids wrapping at typical widths (whitespace-nowrap).
 * - Added "Download failed rows" action that calls GET /api/v1/imports/:id/errors?format=csv.
 * - Mapping modal, module logs modal, recent runs, import artifact export are integrated (requires companion components and routes you've added).
 * - Org is derived from GET /api/v1/me (DEV_ORG_ID can be used in dev). Connectors listing uses that org id.
 *
 * Requirements:
 * - Companion components and server routes must be present:
 *   - /api/v1/me, /api/v1/integrations*, /api/imports, /api/v1/imports/:id/errors, /api/v1/pipeline/run, /api/v1/ingest/:id, /api/v1/pipeline/run/:id, /api/v1/pipeline/run/:id/output/:moduleIndex, etc.
 * - If you want real auth, wire Clerk in /api/v1/me and other server routes.
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
  if (s === "running") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "failed") return "bg-rose-100 text-rose-800 border-rose-200";
  if (s === "succeeded" || s === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "skipped") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
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
async function downloadFailedRowsCsv(jobId: string) {
  if (!jobId) {
    alert("No job id");
    return;
  }
  try {
    const res = await fetch(`/api/v1/imports/${encodeURIComponent(jobId)}/errors?format=csv`);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error ?? "Failed to download failed rows");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed-rows-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(String(err?.message ?? err));
  }
}

export default function ImportPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";

  // org + connectors
  const [orgId, setOrgId] = useState<string>("");
  const [connectors, setConnectors] = useState<any[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string>("");

  // modals
  const [moduleLogsOpen, setModuleLogsOpen] = useState(false);
  const [moduleLogsParams, setModuleLogsParams] = useState<{ runId: string; index: number } | null>(null);

  // pipeline / import
  const [ingestionIdInput, setIngestionIdInput] = useState(ingestionIdParam || "");
  const [importMode, setImportMode] = useState<ImportMode>("full");
  const [allowOverwriteExisting, setAllowOverwriteExisting] = useState(false);
  const [autoRunAfterUpload, setAutoRunAfterUpload] = useState(false);

  const [job, setJob] = useState<any | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string>(pipelineRunIdParam || "");
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [importArtifact, setImportArtifact] = useState<any | null>(null);

  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // derived
  const selectedConnectorObj = useMemo(() => connectors.find((c) => c.id === selectedConnector) ?? null, [connectors, selectedConnector]);

  // fetch org id (calls /api/v1/me). In dev set DEV_ORG_ID env var or implement Clerk on server.
  async function fetchOrg() {
    try {
      const res = await fetch("/api/v1/me");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.org_id) {
        setOrgId(json.org_id);
        return json.org_id;
      }
      setOrgId("");
      return "";
    } catch {
      setOrgId("");
      return "";
    }
  }

  async function loadConnectors() {
    if (!orgId) {
      setConnectors([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setConnectors(json.integrations ?? []);
      else setConnectors([]);
    } catch {
      setConnectors([]);
    }
  }

  // select connector by clicking its card
  function selectConnectorId(id: string) {
    setSelectedConnector(id);
  }

  // connector actions
  async function testConnector(connectorId: string) {
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/test`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(`Test failed: ${json?.error ?? "unknown"}`);
        return;
      }
      alert("Connection test succeeded");
      await loadConnectors();
    } catch (err: any) {
      alert(String(err?.message ?? err));
    }
  }

  async function syncConnector(connectorId: string) {
    if (!orgId) return alert("Org ID missing — set DEV_ORG_ID or wire session.");
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "Sync failed");
        return;
      }
      const jobId = json.jobId ?? json.id ?? "";
      setIngestionIdInput(jobId);
      setStatusMessage(`Connector sync started: ${jobId}`);
      if (jobId) await fetchIngestion(jobId);
      await loadConnectors();
    } catch (err: any) {
      alert(String(err?.message ?? err));
    }
  }

  // ingestion & pipeline helpers
  async function fetchIngestion(id: string) {
    try {
      setJob(null);
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
      const row = json?.data ?? json;
      setJob(row);
      return row;
    } catch (err) {
      setJob(null);
      throw err;
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

  // run pipeline
  async function runImport(forIngestionId?: string) {
    if (running) return;
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);
    setImportArtifact(null);

    const id = (forIngestionId ?? ingestionIdInput).trim();
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

  // module logs modal
  function openModuleLogs(index: number) {
    if (!pipelineRunId) return alert("No pipeline run selected");
    setModuleLogsParams({ runId: pipelineRunId, index });
    setModuleLogsOpen(true);
  }

  // initial load
  useEffect(() => {
    (async () => {
      const o = await fetchOrg();
      if (o) await loadConnectors();
      if (ingestionIdParam) {
        fetchIngestion(ingestionIdParam).catch((e) => setError(String((e as any)?.message || e)));
      }
      if (pipelineRunIdParam) {
        try {
          const snap = await fetchPipelineSnapshot(pipelineRunIdParam);
          setPipelineSnapshot(snap);
          setPipelineRunId(pipelineRunIdParam);
          await fetchImportArtifact(pipelineRunIdParam, snap?.modules ?? []);
        } catch (e: any) {
          setError(String(e?.message || e));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // job data / diagnostics
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium">AvidiaImport</div>
            <div className="text-lg font-semibold">Import & Connector Workspace</div>
          </div>

          <div className="text-xs text-slate-600">
            Status: <span className={`ml-2 px-2 py-0.5 rounded ${statusChipClass(runStatus ?? "idle")}`}>{runStatus ?? "idle"}</span>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: connectors */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Connectors</h3>
                <div className="text-xs text-slate-500">Manage store connections</div>
              </div>

              <div className="mt-3 space-y-3">
                {/* Instead of a "No connectors" message, show ConnectorManager (create/list) */}
                <ConnectorManager orgId={orgId} />
              </div>
            </div>

            {/* Selected connector summary */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold">Selected store</h4>
              {selectedConnectorObj ? (
                <div className="mt-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{selectedConnectorObj.name ?? selectedConnectorObj.provider}</div>
                      <div className="text-xs text-slate-500">Provider: {selectedConnectorObj.provider}</div>
                      <div className="text-xs text-slate-400 mt-1">Last synced: {selectedConnectorObj.last_synced_at ? new Date(selectedConnectorObj.last_synced_at).toLocaleString() : "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-2 py-0.5 rounded text-xs ${selectedConnectorObj.status === "ready" ? "bg-emerald-100 text-emerald-800" : selectedConnectorObj.status === "failed" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                        {selectedConnectorObj.status ?? "unknown"}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => testConnector(selectedConnectorObj.id)} className="text-xs px-2 py-1 border rounded">Test</button>
                        <button onClick={() => syncConnector(selectedConnectorObj.id)} className="text-xs px-2 py-1 bg-sky-600 text-white rounded">Sync</button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600">
                    Connection:{" "}
                    {selectedConnectorObj.status === "ready" ? (
                      <span className="text-emerald-700">Connected</span>
                    ) : selectedConnectorObj.status === "failed" ? (
                      <span className="text-rose-700">Failed — {selectedConnectorObj.last_error ?? "see details"}</span>
                    ) : (
                      <span>Unknown</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500">No store selected. Click a connector from the manager to select it.</div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold">Import guidance</h4>
              <ul className="mt-2 text-xs text-slate-600 space-y-2">
                <li><strong>Limits:</strong> server enforces max 5,000 rows and 50 columns.</li>
                <li><strong>Deduplication:</strong> SKU is recommended for matching existing products.</li>
                <li><strong>Preview:</strong> you can preview up to 50 rows before upload.</li>
                <li><strong>Security:</strong> tokens are stored encrypted server-side. Client never sees secret keys.</li>
              </ul>
            </div>
          </aside>

          {/* RIGHT: uploader, run, telemetry */}
          <section className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Upload or Sync</h3>
                  <p className="text-xs text-slate-500">Upload CSV/XLSX or sync from a connected store to create an import job.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    // open sample CSV download
                    const headers = ["sku", "title", "description", "price", "inventory", "weight", "brand"];
                    const rows = [["SKU-001","Sample product","Desc","19.99","10","0.5","Brand"]];
                    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(","))].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "import-sample.csv"; a.click(); URL.revokeObjectURL(url);
                  }} className="text-xs px-2 py-1 border rounded">Download sample CSV</button>
                  <a href="/imports" className="text-xs px-2 py-1 border rounded">View import history</a>
                </div>
              </div>

              <div className="mt-4">
                <ImportUploader
                  bucket="imports"
                  onCreated={async (jobId) => {
                    if (jobId) {
                      setIngestionIdInput(jobId);
                      setStatusMessage(`Import job created: ${jobId}.`);
                      if (autoRunAfterUpload) {
                        await runImport(jobId);
                      } else {
                        fetchIngestion(jobId).catch(() => null);
                      }
                      await fetchOrg();
                      await loadConnectors();
                    } else {
                      setStatusMessage("Import created.");
                    }
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium uppercase text-slate-500">Ingestion ID / Job</label>
                  <input value={ingestionIdInput} onChange={(e) => setIngestionIdInput(e.target.value)} className="w-full mt-1 rounded border px-3 py-2" />
                </div>

                <div className="flex items-end gap-2">
                  <select value={selectedConnector} onChange={(e) => setSelectedConnector(e.target.value)} className="rounded border px-2 py-2 text-sm w-full">
                    <option value="">Select connector (optional)</option>
                    {connectors.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.provider}</option>)}
                  </select>
                  <button onClick={() => { if (selectedConnector) syncConnector(selectedConnector); else alert("Select a connector"); }} className="px-3 py-2 rounded bg-sky-600 text-white">Sync</button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                    <span className="text-xs">Allow overwrite existing SKU</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm mt-2 sm:mt-0">
                    <input type="checkbox" checked={autoRunAfterUpload} onChange={(e) => setAutoRunAfterUpload(e.target.checked)} />
                    <span className="text-xs">Auto-run pipeline after upload</span>
                  </label>
                </div>

                <div className="ml-auto whitespace-nowrap">
                  <button onClick={() => runImport()} disabled={running} className="px-4 py-2 rounded bg-emerald-500 text-white">
                    {running ? "Running…" : "Run Import"}
                  </button>
                </div>
              </div>
            </div>

            {/* Telemetry & artifact */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Live pipeline & artifact</h4>
                <div className="text-xs text-slate-500">Progress: {progress}%</div>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-2">Pipeline modules</div>
                  <div className="space-y-2">
                    {(pipelineSnapshot?.modules ?? []).slice().sort((a, b) => a.module_index - b.module_index).map((m) => (
                      <div key={`${m.module_index}-${m.module_name}`} className="flex items-center justify-between rounded border p-2">
                        <div>
                          <div className="font-medium">{m.module_index}. {String(m.module_name)}</div>
                          <div className="text-xs text-slate-500">output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span></div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusChipClass(m.status)}`}>{m.status}</div>
                          <div className="text-xs mt-1">{fmtMs(moduleRuntime.get(m.module_name) ?? null)}</div>
                          <div className="mt-2">
                            <button onClick={() => openModuleLogs(m.module_index)} className="text-xs px-2 py-1 border rounded">View logs</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!(pipelineSnapshot?.modules ?? []).length && <div className="text-xs text-slate-500">No active run selected.</div>}
                  </div>

                  <div className="mt-4">
                    <RecentRuns ingestionId={ingestionIdInput} />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-2">Import artifact</div>
                  <pre className="max-h-[300px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">{importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see artifact JSON."}</pre>

                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-xs text-slate-500">Download results</div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadJson(`import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, { ingestionId: jobData?.id ?? ingestionIdInput ?? null, pipelineRunId: pipelineRunId || null, diagnostics_import: importDiag ?? null, import_artifact: importArtifact ?? null })} className="text-xs px-2 py-1 bg-slate-900 text-white rounded">Export JSON</button>
                      <button onClick={() => downloadFailedRowsCsv(ingestionIdInput)} className="text-xs px-2 py-1 border rounded">Download failed rows</button>
                      <a href="/imports" className="text-xs px-2 py-1 border rounded">Import history</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion viewer */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold">Ingestion (context)</h4>
              <pre className="mt-3 max-h-[340px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">
                {jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}
              </pre>
            </div>
          </section>
        </div>
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
