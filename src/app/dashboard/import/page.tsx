"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploader from "@/components/imports/ImportUploader";
import ConnectorManager from "@/components/integrations/ConnectorManager";

/**
 * Dashboard Import page — UX-focused Import workspace
 *
 * Changes from prior:
 * - Removed platform selector and Providers dropdown.
 * - Connector manager panel is OPEN by default so users can immediately connect/select a store.
 * - Cleaner single "Connectors" column and a prominent Upload + Run area.
 * - Added "Auto-run pipeline after upload" option and "Sync connector" quick action.
 * - Guidance, limits, and useful actions surfaced prominently.
 *
 * Important:
 * - Replace getOrgIdForUI() with your session/Clerk-derived org ID retrieval so connectors and syncs are scoped securely.
 * - This page expects the server APIs already present:
 *   - GET /api/v1/integrations?orgId=<org>
 *   - POST /api/v1/integrations
 *   - POST /api/v1/integrations/:id/sync
 *   - POST /api/imports
 *   - POST /api/v1/pipeline/run
 *   - GET /api/v1/ingest/:id
 *   - GET /api/v1/pipeline/run/:id
 *   - GET /api/v1/pipeline/run/:id/output/:moduleIndex
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

  // Connector manager OPEN by default
  const [connectors, setConnectors] = useState<any[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string>("");
  const [showConnectorManager] = useState<boolean>(true); // intentionally true, per request

  // Pipeline & import state
  const [ingestionIdInput, setIngestionIdInput] = useState(ingestionIdParam || "");
  const [importMode, setImportMode] = useState<ImportMode>("full");
  const [allowOverwriteExisting, setAllowOverwriteExisting] = useState(false);
  const [autoRunAfterUpload, setAutoRunAfterUpload] = useState<boolean>(false);

  const [job, setJob] = useState<any | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string>(pipelineRunIdParam || "");
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [importArtifact, setImportArtifact] = useState<any | null>(null);

  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Replace this with your session/Clerk-derived org id retrieval
  function getOrgIdForUI() {
    // TODO: return current org id from auth/session
    return ""; // placeholder — necessary to enable connector listing and sync
  }

  // Load connectors for the org (for cards & dropdown)
  async function loadConnectors() {
    const orgId = getOrgIdForUI();
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

  // Connector quick actions
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
    const orgId = getOrgIdForUI();
    if (!orgId) return alert("Org ID missing — wire session lookup");
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

  // Fetch ingestion/pipeline
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

  // Run pipeline for given ingestion id (optional)
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

  // Initial load
  useEffect(() => {
    loadConnectors().catch(() => null);
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium">AvidiaImport</div>
            <div className="text-sm font-semibold">Import & Connector Workspace</div>
          </div>

          <div className="text-xs text-slate-600">Status: <span className={`ml-2 px-2 py-0.5 rounded ${statusChipClass(runStatus ?? "idle")}`}>{runStatus ?? "idle"}</span></div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Connectors (open by default) */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Connectors</h3>
                <div className="text-xs text-slate-500">Connect stores to import from</div>
              </div>

              <div className="mt-3 space-y-3">
                {/* If connectors empty, ConnectorManager provides create UI */}
                <ConnectorManager orgId={getOrgIdForUI()} />
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Tip: Connectors let you pull product data directly from your store (recommended for large catalogs).
              </div>
            </div>

            {/* Mapping / Import guidance */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold">Import guidance</h4>
              <ul className="mt-2 text-xs text-slate-600 space-y-2">
                <li><strong>Limits:</strong> server enforces max 5,000 rows and 50 columns.</li>
                <li><strong>Deduplication:</strong> SKU is recommended for matching existing products.</li>
                <li><strong>Preview:</strong> you can preview up to 50 rows before upload.</li>
                <li><strong>Security:</strong> service role keys are required server-side — the UI never exposes them.</li>
              </ul>
            </div>
          </aside>

          {/* RIGHT: Upload, Sync, Run, Telemetry */}
          <section className="lg:col-span-8 space-y-4">
            {/* Upload / Sync */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Upload or Sync</h3>
                  <p className="text-xs text-slate-500">Upload CSV/XLSX or sync from a connected store to create an import job.</p>
                </div>
                <div className="text-xs text-slate-500">Bucket: imports</div>
              </div>

              <div className="mt-4">
                <ImportUploader
                  bucket="imports"
                  onCreated={async (jobId) => {
                    if (jobId) {
                      setIngestionIdInput(jobId);
                      setStatusMessage(`Import job created: ${jobId}.`);
                      // auto-run if user opted-in
                      if (autoRunAfterUpload) {
                        await runImport(jobId);
                      } else {
                        // fetch ingestion for preview in panel
                        fetchIngestion(jobId).catch(() => null);
                      }
                      // refresh connectors listing (maybe connector syncs updated last_synced_at)
                      loadConnectors().catch(() => null);
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

              <div className="mt-4 flex items-center gap-3">
                <select value={importMode} onChange={(e) => setImportMode(e.target.value as ImportMode)} className="rounded border px-2 py-1 text-sm">
                  <option value="full">extract + seo + audit + import</option>
                  <option value="import_only">import only</option>
                </select>

                <label className="inline-flex items-center gap-2 ml-4 text-sm">
                  <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                  <span className="text-xs">Allow overwrite existing SKU</span>
                </label>

                <label className="inline-flex items-center gap-2 ml-4 text-sm">
                  <input type="checkbox" checked={autoRunAfterUpload} onChange={(e) => setAutoRunAfterUpload(e.target.checked)} />
                  <span className="text-xs">Auto-run pipeline after upload</span>
                </label>

                <div className="ml-auto">
                  <button onClick={() => runImport()} disabled={running} className="px-3 py-2 rounded bg-emerald-500 text-white">
                    {running ? "Running…" : "Run Import"}
                  </button>
                </div>
              </div>
            </div>

            {/* Telemetry & Artifact */}
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
                          <div className="font-medium">{m.module_index}. {moduleLabel(m.module_name)}</div>
                          <div className="text-xs text-slate-500">output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span></div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusChipClass(m.status)}`}>{m.status}</div>
                          <div className="text-xs mt-1">{fmtMs(moduleRuntime.get(m.module_name) ?? null)}</div>
                        </div>
                      </div>
                    ))}
                    {!(pipelineSnapshot?.modules ?? []).length && <div className="text-xs text-slate-500">No active run selected.</div>}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-2">Import artifact</div>
                  <pre className="max-h-[300px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">{importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see artifact JSON."}</pre>
                  <div className="mt-2 text-right">
                    <button onClick={() => downloadJson(`import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, { ingestionId: jobData?.id ?? ingestionIdInput ?? null, pipelineRunId: pipelineRunId || null, diagnostics_import: importDiag ?? null, import_artifact: importArtifact ?? null })} className="text-xs px-2 py-1 bg-slate-900 text-white rounded">Export JSON</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion viewer */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold">Ingestion (context)</h4>
              <pre className="mt-3 max-h-[340px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">{jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}</pre>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
