"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploader from "@/components/imports/ImportUploader";
import ConnectorManager from "@/components/integrations/ConnectorManager";

/**
 * Dashboard Import page — updated to include:
 * - Platform selector
 * - Connectors dropdown + "Sync connector" quick action
 * - Reuses ImportUploader and ConnectorManager
 *
 * TODO: replace getOrgIdForUI() with your server/session-derived org ID logic (Clerk or other)
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

  // Platform selection (affects mapping/presets)
  const [platform, setPlatform] = useState<string>("bigcommerce");

  // Connector list + selection for quick sync
  const [connectors, setConnectors] = useState<any[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string>("");

  // BigCommerce connection UI state
  const [connName, setConnName] = useState("BigCommerce Store");
  const [storeHash, setStoreHash] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const [connSaving, setConnSaving] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);

  // Pipeline controls
  const [ingestionIdInput, setIngestionIdInput] = useState(ingestionIdParam || "");
  const [importMode, setImportMode] = useState<ImportMode>("full");
  const [allowOverwriteExisting, setAllowOverwriteExisting] = useState(false);

  // Runtime states
  const [job, setJob] = useState<any | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string>(pipelineRunIdParam || "");
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);
  const [importArtifact, setImportArtifact] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper: replace with your session/Clerk org lookup
  function getOrgIdForUI() {
    // TODO: implement session-based org lookup. Return string org id when available.
    return ""; // placeholder — replace to enable connectors listing/sync
  }

  // Load connectors for current org (for selector)
  async function loadConnectors() {
    const orgId = getOrgIdForUI();
    if (!orgId) return;
    try {
      const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setConnectors(json.integrations ?? []);
    } catch {
      // ignore
    }
  }

  async function refreshConnections() {
    try {
      const res = await fetch("/api/v1/integrations/ecommerce/bigcommerce");
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setConnections(json?.connections ?? []);
        const latest = (json?.connections ?? [])[0];
        if (latest?.config?.store_hash) setStoreHash(String(latest.config.store_hash));
      } else {
        setConnStatus(json?.error ?? `Failed to load connections: ${res.status}`);
      }
    } catch (err: any) {
      setConnStatus(String(err?.message ?? err));
    }
  }

  async function saveConnection() {
    setConnSaving(true);
    setConnStatus(null);
    try {
      const res = await fetch("/api/v1/integrations/ecommerce/bigcommerce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: connName,
          store_hash: storeHash,
          access_token: accessToken,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setConnStatus(json?.error || `Save failed: ${res.status}`);
        return;
      }
      setConnStatus("Saved BigCommerce connection.");
      setAccessToken(""); // never keep token in UI after save
      await refreshConnections();
      await loadConnectors();
    } catch (err: any) {
      setConnStatus(String(err?.message ?? err));
    } finally {
      setConnSaving(false);
    }
  }

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

      const steps =
        importMode === "import_only"
          ? ["import"]
          : ["extract", "seo", "audit", "import"];

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

  // Quick connector sync: call our server endpoint to create an import job by connector
  async function syncSelectedConnector() {
    const connectorId = selectedConnector;
    if (!connectorId) return alert("Select a connector to sync");
    const orgId = getOrgIdForUI();
    if (!orgId) return alert("Org ID not available — wire session lookup to enable connectors");
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
      if (jobId) {
        setIngestionIdInput(jobId);
        setStatusMessage(`Connector sync started: ${jobId}`);
        await fetchIngestion(jobId);
      } else {
        setStatusMessage("Connector sync started");
      }
    } catch (err: any) {
      alert(String(err?.message ?? err));
    }
  }

  // Initial loads
  useEffect(() => {
    refreshConnections().catch(() => null);
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

  const topInfo = (() => {
    if (!pipelineRunId) return "Idle";
    if (running || runStatus === "running") return "Running…";
    return `Run ${pipelineRunId.slice(0, 8)}…`;
  })();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8 lg:py-6 space-y-4">
        {/* Top bar: platform selector + status */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
              AvidiaImport
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded px-2 py-1 border text-sm" aria-label="Platform">
                <option value="bigcommerce">BigCommerce</option>
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
                <option value="magento">Magento</option>
                <option value="squarespace">Squarespace</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">{topInfo}</div>
        </section>

        {/* Main grid: left connection + right uploader/run */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* connections */}
          <div className="lg:col-span-5 rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Connections</div>
            <ConnectorManager orgId={getOrgIdForUI()} />
          </div>

          {/* uploader + run */}
          <div className="lg:col-span-7 rounded-2xl border bg-white p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Upload or Sync</h2>
                  <p className="text-xs text-slate-500">Upload a CSV/XLSX or choose a connector to sync.</p>
                </div>
                <div className="text-xs text-slate-500">Bucket: imports</div>
              </div>
            </div>

            <div className="mb-4">
              <ImportUploader
                bucket="imports"
                platform={platform}
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

            <div className="mb-4">
              <label className="text-xs font-medium">ingestionId</label>
              <input value={ingestionIdInput} onChange={(e) => setIngestionIdInput(e.target.value)} className="w-full mt-1 rounded border px-3 py-2" />

              {/* connector quick selector + sync button */}
              <div className="flex gap-2 items-center mt-2">
                <select value={selectedConnector} onChange={(e) => setSelectedConnector(e.target.value)} className="flex-1 rounded border px-2 py-1">
                  <option value="">-- use upload or choose connector --</option>
                  {connectors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.provider}
                    </option>
                  ))}
                </select>
                <button onClick={syncSelectedConnector} className="px-3 py-2 rounded bg-sky-600 text-white">Sync connector</button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2">
                <select value={importMode} onChange={(e) => setImportMode(e.target.value as ImportMode)} className="rounded border px-2 py-1">
                  <option value="full">extract + seo + audit + import</option>
                  <option value="import_only">import only</option>
                </select>

                <label className="inline-flex items-center gap-2 ml-4">
                  <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                  <span className="text-xs">Allow overwrite existing SKU</span>
                </label>

                <div className="ml-auto">
                  <button onClick={runImport} disabled={running} className="px-3 py-2 rounded bg-emerald-500 text-white">
                    {running ? "Running…" : "Run Import"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Pipeline progress</div>
              <div className="mt-2 h-2 w-full rounded bg-slate-200"><div className="h-full bg-gradient-to-r from-sky-400 to-emerald-300" style={{ width: `${progress}%` }} /></div>
            </div>
          </div>
        </section>

        {/* Telemetry & results (kept intact) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 rounded-2xl border bg-white p-4">
            <h3 className="text-sm font-semibold">Live pipeline</h3>
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

              {!(pipelineSnapshot?.modules ?? []).length && <div className="text-xs text-slate-500">No pipeline run selected yet.</div>}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Import result</h3>
                <div>
                  <button onClick={() => downloadJson(`import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, { ingestionId: jobData?.id ?? ingestionIdInput ?? null, pipelineRunId: pipelineRunId || null, diagnostics_import: importDiag ?? null, import_artifact: importArtifact ?? null })} className="px-3 py-2 rounded bg-slate-900 text-white text-xs">Export JSON</button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded border p-3">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="font-semibold mt-1">{importDiag?.status ?? "—"}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-slate-500">Action</div>
                  <div className="font-semibold mt-1">{importAction ?? "—"}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-slate-500">Product ID</div>
                  <div className="font-mono mt-1">{importResult?.product_id ?? importArtifact?.output?.import?.result?.product_id ?? "—"}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500">Raw artifact</div>
                <pre className="mt-2 max-h-[260px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">{importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see output JSON."}</pre>
              </div>
            </div>

            <div className="rounded border bg-white p-4">
              <h3 className="text-sm font-semibold">Ingestion (context)</h3>
              <pre className="mt-3 max-h-[340px] overflow-auto rounded border bg-slate-900 p-3 text-[11px] text-white">{jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}</pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
