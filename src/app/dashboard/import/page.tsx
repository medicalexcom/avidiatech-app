"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImportUploaderWithPreset from "@/components/imports/ImportUploaderWithPreset";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import ModuleLogsModal from "@/components/pipeline/ModuleLogsModal";
import RecentRuns from "@/components/pipeline/RecentRuns";
import { MappingPresetSelector } from "@/components/imports/MappingPresetSelector";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/* Helper types & functions (same as before but mappingPreset typed as any to accept both id/name/object) */
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

/** tiny UI helpers (no deps) */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function statusChipClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "running") return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-500/40";
  if (s === "failed") return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-500/40";
  if (s === "succeeded" || s === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500/40";
  if (s === "skipped") return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700";
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

async function downloadFailedRowsCsv(jobId: string, toast: any) {
  if (!jobId) {
    toast?.error?.("No job id");
    return;
  }
  try {
    const res = await fetch(`/api/v1/imports/${encodeURIComponent(jobId)}/errors?format=csv`);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast?.error?.(j?.error ?? "Failed to download failed rows");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed-rows-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.("Downloaded failed rows");
  } catch (err: any) {
    toast?.error?.(String(err?.message ?? err));
  }
}

/* Small UI helpers */
const Spinner = () => (
  <svg className="animate-spin h-4 w-4 inline-block mr-2 align-middle" viewBox="0 0 24 24" aria-hidden>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

function SkeletonRow() {
  return <div className="h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 animate-pulse border border-slate-200 dark:border-slate-800" />;
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/55",
        className
      )}
    >
      {children}
    </div>
  );
}

/* Page component */
export default function ImportPage() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";

  // org + connectors
  const [orgId, setOrgId] = useState<string>("");
  const [connectors, setConnectors] = useState<any[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string>("");

  // mapping preset — accept object or string
  const [mappingPreset, setMappingPreset] = useState<any | null>(null);

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

  // confirm delete import job
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [toDeleteIngestionId, setToDeleteIngestionId] = useState<string | null>(null);

  // derived
  const selectedConnectorObj = useMemo(
    () => connectors.find((c) => c.id === selectedConnector) ?? null,
    [connectors, selectedConnector]
  );

  // fetch org id (calls /api/v1/me)
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

  function selectConnectorId(id: string) {
    setSelectedConnector(id);
    toast?.info?.("Connector selected");
  }

  async function testConnector(connectorId: string) {
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/test`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(`Test failed: ${json?.error ?? "unknown"}`);
        return;
      }
      toast.success("Connection test succeeded");
      await loadConnectors();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function syncConnector(connectorId: string) {
    if (!orgId) {
      toast.error("Org ID missing — set DEV_ORG_ID or wire session.");
      return;
    }
    try {
      const res = await fetch(`/api/v1/integrations/${encodeURIComponent(connectorId)}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Sync failed");
        return;
      }
      const jobId = json.jobId ?? json.id ?? "";
      setIngestionIdInput(jobId);
      toast.success(`Connector sync started: ${jobId}`);
      if (jobId) await fetchIngestion(jobId);
      await loadConnectors();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

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

  async function runImport(forIngestionId?: string) {
    if (running) return;
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);
    setImportArtifact(null);

    const id = (forIngestionId ?? ingestionIdInput).trim();
    if (!id) {
      toast.error("Enter an ingestionId first.");
      return;
    }

    setRunning(true);
    try {
      toast.info("Loading ingestion");
      await fetchIngestion(id);

      const steps = importMode === "import_only" ? ["import"] : ["extract", "seo", "audit", "import"];

      toast.info("Starting pipeline run");
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
              // include mappingPreset id if available, or the preset itself
              mappingPreset: mappingPreset?.id ?? mappingPreset ?? undefined,
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

      toast.info("Pipeline running");
      const snap = await pollPipeline(runId, 300_000, 2000);

      toast.info("Refreshing ingestion");
      await fetchIngestion(id);

      toast.info("Loading import artifact");
      await fetchImportArtifact(runId, snap?.modules ?? []);

      toast.success("Import run completed");
    } catch (e: any) {
      setError(String(e?.message || e));
      toast.error(String(e?.message || e));
    } finally {
      setRunning(false);
    }
  }

  function openModuleLogs(index: number) {
    if (!pipelineRunId) {
      toast.error("No pipeline run selected");
      return;
    }
    setModuleLogsParams({ runId: pipelineRunId, index });
    setModuleLogsOpen(true);
  }

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

  const jobData = useMemo(() => {
    if (!job) return null;
    if ((job as any)?.data?.data) return (job as any).data.data;
    if ((job as any)?.data) return (job as any).data;
    return job;
  }, [job]);

  const auditDiag = jobData?.diagnostics?.audit ?? null;
  const importDiag = jobData?.diagnostics?.import ?? null;

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

  const importAction = importDiag?.result?.action ?? importArtifact?.output?.import?.result?.action ?? null;
  const importNeedsReview = Boolean(importDiag?.result?.needs_review ?? importArtifact?.output?.import?.result?.needs_review);

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 " +
    "dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-50 dark:placeholder:text-slate-500";

  const selectCls =
    "rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 " +
    "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 " +
    "dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-50";

  const btnGhost =
    "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-800 shadow-sm hover:bg-white " +
    "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-950";

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm transition " +
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:opacity-95 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 disabled:shadow-none";

  const btnSecondary =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-50 shadow-sm transition " +
    "bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-60 disabled:shadow-none " +
    "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <style jsx>{`
        .import-gradient {
          background-size: 220% 220%;
          animation: importGradientShift 7s ease-in-out infinite;
          filter: drop-shadow(0 10px 26px rgba(56, 189, 248, 0.18));
        }
        @keyframes importGradientShift {
          0% {
            background-position: 0% 50%;
            transform: translateZ(0) scale(1);
          }
          50% {
            background-position: 100% 50%;
            transform: translateZ(0) scale(1.01);
          }
          100% {
            background-position: 0% 50%;
            transform: translateZ(0) scale(1);
          }
        }
      `}</style>

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-36 -left-28 h-[26rem] w-[26rem] rounded-full bg-cyan-300/22 blur-3xl dark:bg-cyan-500/14" />
        <div className="absolute -top-28 right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-amber-300/18 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -bottom-48 right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-emerald-300/16 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.90)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8 space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-50 border border-cyan-200 dark:bg-slate-900 dark:border-cyan-400/30">
                <span className={cx("h-1.5 w-1.5 rounded-full", running ? "bg-cyan-400 animate-pulse" : "bg-slate-400")} />
              </span>
              AvidiaTech • Import
              {ingestionIdInput ? (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">{String(ingestionIdInput).slice(0, 8)}…</span>
                </>
              ) : null}
              {pipelineRunId ? (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <span className="font-mono text-[10px]">run:{String(pipelineRunId).slice(0, 8)}…</span>
                </>
              ) : null}
            </div>

            <div>
              <div className="text-lg font-semibold leading-tight">
                Import &{" "}
                <span
                  className={cx(
                    "bg-clip-text text-transparent import-gradient",
                    "bg-[linear-gradient(90deg,rgba(34,211,238,1),rgba(56,189,248,1),rgba(52,211,153,1),rgba(250,204,21,1))]"
                  )}
                >
                  Connector Workspace
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Upload CSV/XLSX or sync from a connected store, then run the pipeline.
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            Status:{" "}
            <span className={cx("ml-2 inline-flex items-center rounded-full border px-2 py-0.5", statusChipClass(runStatus ?? "idle"))}>
              {runStatus ?? "idle"}
            </span>
          </div>
        </section>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: connectors */}
          <aside className="lg:col-span-4 space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Connectors</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">Manage store connections</div>
              </div>

              <div className="mt-3 space-y-3">
                <ConnectorManager orgId={orgId} selectedId={selectedConnector} onSelect={selectConnectorId} />
              </div>
            </Card>

            <Card>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Selected store</h4>
              {selectedConnectorObj ? (
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{selectedConnectorObj.name ?? selectedConnectorObj.provider}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Provider: {selectedConnectorObj.provider}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Last synced:{" "}
                        {selectedConnectorObj.last_synced_at
                          ? new Date(selectedConnectorObj.last_synced_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div
                        className={cx(
                          "px-2 py-0.5 rounded-full text-xs border",
                          selectedConnectorObj.status === "ready"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500/40"
                            : selectedConnectorObj.status === "failed"
                            ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-500/40"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700"
                        )}
                      >
                        {selectedConnectorObj.status ?? "unknown"}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => testConnector(selectedConnectorObj.id)} className={cx(btnGhost, "px-2 py-1 text-xs")}>
                          Test
                        </button>
                        <button onClick={() => syncConnector(selectedConnectorObj.id)} className={cx(btnPrimary, "px-2 py-1 text-xs")}>
                          Sync
                        </button>
                        <button onClick={() => setSelectedConnector(selectedConnectorObj.id)} className={cx(btnGhost, "px-2 py-1 text-xs")}>
                          Details
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    Connection:{" "}
                    {selectedConnectorObj.status === "ready" ? (
                      <span className="text-emerald-700 dark:text-emerald-200">Connected</span>
                    ) : selectedConnectorObj.status === "failed" ? (
                      <span className="text-rose-700 dark:text-rose-200">
                        Failed — {selectedConnectorObj.last_error ?? "see details"}
                      </span>
                    ) : (
                      <span>Unknown</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  No store selected. Click a connector from the manager to select it.
                </div>
              )}
            </Card>

            <Card>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Import guidance</h4>
              <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li>
                  <strong>Limits:</strong> server enforces max 5,000 rows and 50 columns.
                </li>
                <li>
                  <strong>Deduplication:</strong> SKU is recommended for matching existing products.
                </li>
                <li>
                  <strong>Preview:</strong> you can preview up to 50 rows before upload.
                </li>
                <li>
                  <strong>Security:</strong> tokens are stored encrypted server-side. Client never sees secret keys.
                </li>
              </ul>
            </Card>
          </aside>

          {/* RIGHT: uploader, run, telemetry */}
          <section className="lg:col-span-8 space-y-4">
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Upload or Sync</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload CSV/XLSX or sync from a connected store to create an import job.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const headers = ["sku", "title", "description", "price", "inventory", "weight", "brand"];
                      const rows = [["SKU-001", "Sample product", "Desc", "19.99", "10", "0.5", "Brand"]];
                      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "import-sample.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                      toast?.info?.("Sample CSV downloaded");
                    }}
                    className={cx(btnGhost, "text-xs px-2 py-1")}
                  >
                    Download sample CSV
                  </button>
                  <a href="/imports" className={cx(btnGhost, "text-xs px-2 py-1")}>
                    View import history
                  </a>
                </div>
              </div>

              <div className="mt-4">
                <ImportUploaderWithPreset
                  bucket="imports"
                  mappingPreset={mappingPreset}
                  onCreated={async (jobId: string) => {
                    if (jobId) {
                      setIngestionIdInput(jobId);
                      toast.success(`Import job created: ${jobId}.`);
                      if (autoRunAfterUpload) {
                        await runImport(jobId);
                      } else {
                        fetchIngestion(jobId).catch(() => null);
                      }
                      await fetchOrg();
                      await loadConnectors();
                    } else {
                      toast.info("Import created.");
                    }
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Ingestion ID / Job
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input value={ingestionIdInput} onChange={(e) => setIngestionIdInput(e.target.value)} className={inputCls} />
                    <button
                      onClick={() => {
                        if (!ingestionIdInput) return toast.error("No ingestion id to delete");
                        setToDeleteIngestionId(ingestionIdInput);
                        setConfirmDeleteOpen(true);
                      }}
                      className={cx(btnGhost, "px-3 py-2")}
                      aria-label="Delete ingestion job"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <select value={selectedConnector} onChange={(e) => setSelectedConnector(e.target.value)} className={cx(selectCls, "w-full")}>
                    <option value="">Select connector (optional)</option>
                    {connectors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name ?? c.provider}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (selectedConnector) syncConnector(selectedConnector);
                      else toast.error("Select a connector");
                    }}
                    className={cx(btnPrimary, "whitespace-nowrap")}
                  >
                    Sync
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                    <span className="text-xs text-slate-700 dark:text-slate-200">Allow overwrite existing SKU</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm mt-2 sm:mt-0">
                    <input type="checkbox" checked={autoRunAfterUpload} onChange={(e) => setAutoRunAfterUpload(e.target.checked)} />
                    <span className="text-xs text-slate-700 dark:text-slate-200">Auto-run pipeline after upload</span>
                  </label>
                </div>

                <div className="ml-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MappingPresetSelector
                      provider={selectedConnectorObj?.provider}
                      onSelect={(preset: any) => {
                        setMappingPreset(preset ?? null);
                        toast?.info?.("Mapping preset selected");
                      }}
                    />
                    {mappingPreset && (
                      <div className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-slate-200 bg-white/70 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                        <span className="max-w-[260px] truncate">{mappingPreset?.name ?? mappingPreset?.id ?? String(mappingPreset)}</span>
                        <button
                          onClick={() => {
                            setMappingPreset(null);
                            toast?.info?.("Mapping preset cleared");
                          }}
                          className={cx(btnGhost, "text-xs px-2 py-1")}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-auto whitespace-nowrap">
                  <button onClick={() => runImport()} disabled={running} className={cx(btnPrimary, "px-4 py-2")} aria-label="Run import">
                    {running ? (
                      <>
                        <Spinner />
                        Running…
                      </>
                    ) : (
                      "Run Import"
                    )}
                  </button>
                </div>
              </div>

              {/* (kept) importMode state exists — UI not removed/changed intentionally */}
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-100">
                  {error}
                </div>
              ) : null}

              {statusMessage ? (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{statusMessage}</div>
              ) : null}

              {(importAction || importNeedsReview || auditDiag) ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {importAction ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/50">
                      <span className="font-mono">import.action</span>
                      <span className="font-semibold">{String(importAction)}</span>
                    </span>
                  ) : null}
                  {importNeedsReview ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                      Needs review
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Card>

            {/* Telemetry & artifact */}
            <Card>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live pipeline & artifact</h4>
                <div className="text-xs text-slate-500 dark:text-slate-400">Progress: {progress}%</div>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Pipeline modules</div>
                  <div className="space-y-2">
                    {(pipelineSnapshot?.modules ?? [])
                      .slice()
                      .sort((a, b) => a.module_index - b.module_index)
                      .map((m) => (
                        <div
                          key={`${m.module_index}-${m.module_name}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/45"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {m.module_index}. {String(m.module_name)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusChipClass(m.status))}>
                              {m.status}
                            </div>
                            <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">{fmtMs(moduleRuntime.get(m.module_name) ?? null)}</div>
                            <div className="mt-2">
                              <button onClick={() => openModuleLogs(m.module_index)} className={cx(btnGhost, "text-xs px-2 py-1")}>
                                View logs
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    {!(pipelineSnapshot?.modules ?? []).length && (
                      <>
                        <div className="text-xs text-slate-500 dark:text-slate-400">No active run selected.</div>
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    )}
                  </div>

                  <div className="mt-4">
                    <RecentRuns ingestionId={ingestionIdInput} pipelineId={pipelineRunId} />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Import artifact</div>
                  <pre className="max-h-[300px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
                    {importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see artifact JSON."}
                  </pre>

                  <div className="mt-2 flex justify-between items-center gap-2 flex-wrap">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Download results</div>
                    <div className="flex gap-2 flex-wrap">
                      <button
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
                        className={cx(btnSecondary, "text-xs px-2 py-1")}
                      >
                        Export JSON
                      </button>
                      <button onClick={() => downloadFailedRowsCsv(ingestionIdInput, toast)} className={cx(btnGhost, "text-xs px-2 py-1")}>
                        Download failed rows
                      </button>
                      <a href="/imports" className={cx(btnGhost, "text-xs px-2 py-1")}>
                        Import history
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ingestion viewer */}
            <Card>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Ingestion (context)</h4>
              <pre className="mt-3 max-h-[340px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
                {jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}
              </pre>
            </Card>
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

      {/* Connector details drawer */}
      <ConnectorDetailsDrawer integrationId={selectedConnector} isOpen={Boolean(selectedConnector)} onClose={() => setSelectedConnector("")} />

      {/* Confirm delete ingestion */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        title="Delete import job"
        description={`Delete import job ${toDeleteIngestionId}? This cannot be undone.`}
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          if (!toDeleteIngestionId) return;
          try {
            const res = await fetch(`/api/v1/imports/${encodeURIComponent(toDeleteIngestionId)}`, { method: "DELETE" });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.ok) {
              toast.error(json?.error ?? "Delete failed");
              return;
            }
            toast.success("Import deleted");
            setIngestionIdInput("");
            setJob(null);
            setToDeleteIngestionId(null);
          } catch (err: any) {
            toast.error(String(err?.message ?? err));
          }
        }}
      />
    </main>
  );
}
