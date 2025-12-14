"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploader from "@/components/imports/ImportUploader";

/**
 * Dashboard Import page (upgraded)
 *
 * - Restores the full connection UI (BigCommerce) and pipeline workspace from the original page.
 * - Uses the reusable ImportUploader component for uploads & preview.
 * - Keeps pipeline run controls, live telemetry, artifact viewer, and ingestion viewer.
 *
 * Notes:
 * - The server-side APIs must enforce org/session verification. This client assumes existing endpoints:
 *   - GET /api/v1/integrations/ecommerce/bigcommerce
 *   - POST /api/v1/integrations/ecommerce/bigcommerce
 *   - POST /api/v1/pipeline/run
 *   - GET /api/v1/ingest/:id
 *   - GET /api/v1/pipeline/run/:id
 *   - GET /api/v1/pipeline/run/:id/output/:moduleIndex
 *   - POST /api/imports (used by ImportUploader)
 *
 * - If you use Clerk or another auth provider, ensure those server routes read session and derive org id.
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

  // Uploader/preview state (kept for local UI use)
  const [filePreviewInfo, setFilePreviewInfo] = useState<{ headers: string[]; rows: any[] } | null>(null);

  // --- Connections (original behavior)
  async function refreshConnections() {
    try {
      const res = await fetch("/api/v1/integrations/ecommerce/bigcommerce");
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setConnections(json?.connections ?? []);
        const latest = (json?.connections ?? [])[0];
        if (latest?.config?.store_hash) setStoreHash(String(latest.config.store_hash));
      } else {
        // If endpoint expects session-based org, it will return 401/403 otherwise; show message
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
    } catch (err: any) {
      setConnStatus(String(err?.message ?? err));
    } finally {
      setConnSaving(false);
    }
  }

  // --- Pipeline / ingestion helpers (preserve original behavior)
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
              platform: "bigcommerce",
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

  // initial loads
  useEffect(() => {
    refreshConnections().catch(() => null);
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
      {/* Background gradients + subtle grid (kept subtle) */}
      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8 lg:py-6 space-y-4">
        {/* Top bar */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 border border-sky-300 dark:bg-slate-900 dark:border-sky-400/60">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              </span>
              AvidiaImport
              {(jobData?.id || ingestionIdInput) && (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">{(jobData?.id || ingestionIdInput).slice(0, 8)}…</span>
                </>
              )}
              {pipelineRunId && (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">run:{pipelineRunId.slice(0, 8)}…</span>
                </>
              )}
            </div>

            <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">{topInfo}</div>
          </div>

          {statusMessage && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-sky-200 px-3 py-1.5 text-[11px] text-sky-700 shadow-sm dark:bg-slate-950/70 dark:border-sky-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              {statusMessage}
            </div>
          )}
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Connection panel (left) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:bg-slate-950/60 dark:border-slate-800">
            <div className="p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">BigCommerce connection</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Store hash is saved as config. Token is encrypted server-side and never shown again.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                  v3 Catalog
                </span>
              </div>

              {connStatus && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                  {connStatus}
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Connection name
                  </label>
                  <input
                    value={connName}
                    onChange={(e) => setConnName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Store hash
                  </label>
                  <input
                    value={storeHash}
                    onChange={(e) => setStoreHash(e.target.value)}
                    placeholder="abcd1234"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Access token
                  </label>
                  <input
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="x-auth-token..."
                    type="password"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Stored encrypted using <span className="font-mono">INTEGRATIONS_ENCRYPTION_KEY</span>.
                  </p>
                </div>

                <button
                  onClick={saveConnection}
                  disabled={connSaving || !storeHash || !accessToken}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {connSaving ? "Saving…" : "Save BigCommerce connection"}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => refreshConnections()}
                    className="text-[11px] text-sky-700 hover:text-sky-600 underline underline-offset-4 dark:text-sky-300 dark:hover:text-sky-200"
                  >
                    Refresh connections
                  </button>
                </div>

                <div className="mt-2 space-y-2 text-xs">
                  {(connections ?? []).slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900 dark:text-slate-50">
                          {c.name || "BigCommerce"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.status}</div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        store_hash: <span className="font-mono">{c.config?.store_hash ?? "—"}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        updated: {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))}
                  {(!connections || connections.length === 0) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      No connections saved yet for this tenant.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Run import + Upload (right) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:bg-slate-950/60 dark:border-slate-800">
            <div className="p-4 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Run Import (pipeline)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Safe-gated upsert: SKU match will require manual overwrite approval unless you enable overwrite. If audit fails, import is skipped automatically.
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(runStatus ?? "idle")}`}>
                  {runStatus ?? "idle"}
                </span>
              </div>

              {error && (
                <div className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-3 text-sm shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
                  {error}
                </div>
              )}

              {/* Upload & preview (ImportUploader) */}
              <div className="mt-4 border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Upload import file</div>
                    <div className="text-xs text-slate-500 mt-1">CSV or Excel (.xlsx, .xls). Max rows: 5000, Max columns: 50.</div>
                  </div>
                  <div className="text-xs text-slate-500">Bucket: imports</div>
                </div>

                <div className="mt-3">
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
              </div>

              {/* Run form */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7 space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    ingestionId
                  </label>
                  <input
                    value={ingestionIdInput}
                    onChange={(e) => setIngestionIdInput(e.target.value)}
                    placeholder="b0324634-1593-4fad-a9de-70215a2deb38"
                    className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 text-sm"
                  />

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Mode:</span>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as ImportMode)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <option value="full">extract + seo + audit + import</option>
                        <option value="import_only">import only</option>
                      </select>
                    </div>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allowOverwriteExisting}
                        onChange={(e) => setAllowOverwriteExisting(e.target.checked)}
                      />
                      <span className="text-[11px]">
                        Allow overwrite existing SKU (unsafe)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-2">
                  <button
                    type="button"
                    onClick={runImport}
                    disabled={running}
                    className="w-full px-4 py-3 rounded-xl bg-sky-500 text-slate-950 text-sm font-semibold shadow-sm hover:bg-sky-400 disabled:opacity-60"
                  >
                    {running ? "Running…" : "Run Import"}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setError(null);
                        if (!ingestionIdInput.trim()) throw new Error("Enter an ingestionId first.");
                        await fetchIngestion(ingestionIdInput.trim());
                        setStatusMessage("Loaded ingestion");
                      } catch (e: any) {
                        setError(String(e?.message || e));
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 text-slate-50 text-sm font-semibold shadow-sm hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    Load ingestion (no run)
                  </button>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Audit</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusChipClass(auditStatus ?? "unknown")}`}>
                        {auditStatus ?? "unknown"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Score</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {typeof auditScore === "number" ? `${auditScore}/100` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Import action</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {importAction ?? "—"}
                      </span>
                    </div>
                    {importNeedsReview && (
                      <div className="mt-1 text-amber-700 dark:text-amber-200">
                        Needs review: SKU exists and overwrite is disabled.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              {pipelineSnapshot?.modules?.length ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Pipeline progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Live pipeline + results */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Live pipeline status */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live pipeline</h3>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${statusChipClass(runStatus ?? "idle")}`}>
                {runStatus ?? "idle"}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {(pipelineSnapshot?.modules ?? [])
                .slice()
                .sort((a, b) => a.module_index - b.module_index)
                .map((m) => (
                  <div
                    key={`${m.module_index}-${m.module_name}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                        {m.module_index}. {moduleLabel(m.module_name)}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span>
                      </div>
                      {m.error ? (
                        <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-200 truncate">
                          error: {typeof m.error === "string" ? m.error : JSON.stringify(m.error)}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${statusChipClass(m.status)}`}>
                        {m.status}
                      </span>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {fmtMs(moduleRuntime.get(m.module_name) ?? null)}
                      </div>
                    </div>
                  </div>
                ))}

              {!(pipelineSnapshot?.modules ?? []).length && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  No pipeline run selected yet. Run import to see module telemetry.
                </div>
              )}
            </div>
          </div>

          {/* Results / artifact viewer */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Import result</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(
                        `import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`,
                        {
                          ingestionId: jobData?.id ?? ingestionIdInput ?? null,
                          pipelineRunId: pipelineRunId || null,
                          diagnostics_import: importDiag ?? null,
                          import_artifact: importArtifact ?? null,
                        }
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-50 border border-slate-900 shadow-sm hover:bg-slate-800 dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{importDiag?.status ?? "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Action</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{importAction ?? "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Product ID</div>
                  <div className="mt-1 font-mono text-slate-900 dark:text-slate-50">
                    {importResult?.product_id ?? importArtifact?.output?.import?.result?.product_id ?? "—"}
                  </div>
                </div>
              </div>

              {importNeedsReview && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
                  SKU already exists in BigCommerce. Import is in <strong>needs_review</strong> mode and did not update anything. If you intend to overwrite, check <strong>Allow overwrite existing SKU</strong> and re-run.
                </div>
              )}

              <div className="mt-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Raw artifact (durable output)</div>
                <pre className="mt-2 max-h-[380px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] text-slate-100 dark:border-slate-800">
                  {importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see output_ref JSON."}
                </pre>
              </div>
            </div>

            {/* Ingestion viewer */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 dark:bg-slate-900/70 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Ingestion (context)</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">product_ingestions</span>
              </div>
              <pre className="mt-3 max-h-[340px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] text-slate-100 dark:border-slate-800">
                {jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
