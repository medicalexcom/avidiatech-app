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

/* Helper types & functions */
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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

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
  if (s === "running") return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/45 dark:text-amber-100 dark:border-amber-500/40";
  if (s === "failed") return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/45 dark:text-rose-100 dark:border-rose-500/40";
  if (s === "succeeded" || s === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/40";
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
  return (
    <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 animate-pulse dark:border-slate-800 dark:bg-slate-950/45" />
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

  // details drawer (separate from selection so "Details" doesn't hijack selection state)
  const [detailsConnectorId, setDetailsConnectorId] = useState<string>("");

  // flatten/normalize ConnectorManager UI without editing that component
  const connectorShellRef = React.useRef<HTMLDivElement | null>(null);

  function normalizeConnectorManagerUI() {
    const root = connectorShellRef.current;
    if (!root) return;

    // Hide duplicated headings by exact text
    const hide = new Set(["connectors", "create connector"]);
    root.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,p,label").forEach((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      if (hide.has(t)) (el as HTMLElement).style.display = "none";
    });

    // Remove nested-card vibe: kill shadows, white panels, borders (but keep inputs/buttons)
    root.querySelectorAll(".shadow,.shadow-sm,.shadow-md,.shadow-lg").forEach((el) => {
      (el as HTMLElement).style.boxShadow = "none";
    });

    root.querySelectorAll(".bg-white").forEach((el) => {
      const h = el as HTMLElement;
      const tag = h.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      h.style.background = "transparent";
    });

    root.querySelectorAll(".border").forEach((el) => {
      const h = el as HTMLElement;
      const tag = h.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      h.style.borderColor = "transparent";
    });

    // Flatten frames around selects (often Provider dropdown wrapper)
    root.querySelectorAll("select").forEach((sel) => {
      let p: HTMLElement | null = sel.parentElement as HTMLElement | null;
      let steps = 0;
      while (p && p !== root && steps < 8) {
        const cls = String(p.className || "");
        if (cls.includes("border") && (cls.includes("rounded") || cls.includes("shadow") || cls.includes("bg-white"))) {
          p.style.border = "0";
          p.style.background = "transparent";
          p.style.boxShadow = "none";
          p.style.padding = "0";
        }
        p = p.parentElement as HTMLElement | null;
        steps++;
      }
    });
  }

  useEffect(() => {
    const t = setTimeout(() => normalizeConnectorManagerUI(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, connectors.length, selectedConnector]);

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
      toast.success(`Sync started: ${jobId}`);
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

  // premium classes
  const input =
    "h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 " +
    "dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-50 dark:placeholder:text-slate-500";

  const select =
    "h-10 rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 " +
    "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 " +
    "dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-50";

  const btnGhost =
    "h-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 text-sm text-slate-800 shadow-sm hover:bg-white " +
    "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-950";

  const btnPrimary =
    "h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-950 shadow-sm transition " +
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:opacity-95 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 disabled:shadow-none";

  const btnDark =
    "h-10 inline-flex items-center justify-center rounded-xl px-3 text-sm font-semibold text-white shadow-sm transition " +
    "bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-60 " +
    "dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <style jsx>{`
        .headline-grad {
          background-size: 220% 220%;
          animation: gshift 8s ease-in-out infinite;
        }
        @keyframes gshift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-36 -left-28 h-[28rem] w-[28rem] rounded-full bg-cyan-300/22 blur-3xl dark:bg-cyan-500/14" />
        <div className="absolute -top-40 right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/14 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute -bottom-52 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-emerald-300/16 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Top bar */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-50 border border-cyan-200 dark:bg-slate-900 dark:border-cyan-400/30">
                <span className={cx("h-1.5 w-1.5 rounded-full", running ? "bg-cyan-400 animate-pulse" : "bg-slate-400")} />
              </span>
              Data Intelligence · AvidiaImport
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

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              {runStatus ? `pipeline: ${runStatus}` : "ready"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Status:{" "}
              <span className={cx("ml-2 inline-flex items-center rounded-full border px-2 py-0.5", statusChipClass(runStatus ?? "idle"))}>
                {runStatus ?? "idle"}
              </span>
            </div>
          </div>
        </section>

        {/* Primary workspace */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(148,163,184,0.22)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 dark:shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-5 lg:p-5">
            {/* LEFT: Stores & Connectors (single card, flattened inside) */}
            <aside className="lg:col-span-4">
              <div
                ref={connectorShellRef}
                data-connector-shell
                className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white/95 to-slate-50/70 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.18)] dark:border-slate-800 dark:from-slate-950/70 dark:to-slate-950/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stores & Connectors</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Select a store, test, sync, or open details.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                      <span className={cx("h-1.5 w-1.5 rounded-full", orgId ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-700")} />
                      {orgId ? "org loaded" : "org unknown"}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                      <span className="font-mono">{connectors.length}</span> stores
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-12">
                    <div className="rounded-2xl border border-slate-200/60 bg-white/50 p-3 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/30">
                      <ConnectorManager orgId={orgId} selectedId={selectedConnector} onSelect={selectConnectorId} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/35">
                        SKU recommended for matching
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/35">
                        Preview up to 50 rows
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/35">
                        Max 5,000 rows / 50 columns
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white/70 to-white/40 p-3 dark:border-slate-800/70 dark:from-slate-950/35 dark:to-slate-950/20">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Selected store
                        </div>

                        {selectedConnectorObj ? (
                          <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", statusChipClass(selectedConnectorObj.status))}>
                            {selectedConnectorObj.status ?? "unknown"}
                          </span>
                        ) : null}
                      </div>

                      {selectedConnectorObj ? (
                        <div className="mt-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                              {selectedConnectorObj.name ?? selectedConnectorObj.provider}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              Provider: <span className="font-medium">{selectedConnectorObj.provider}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Last synced:{" "}
                              {selectedConnectorObj.last_synced_at ? new Date(selectedConnectorObj.last_synced_at).toLocaleString() : "—"}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button onClick={() => testConnector(selectedConnectorObj.id)} className={cx(btnGhost, "h-9 px-2 text-xs")}>
                              Test
                            </button>
                            <button onClick={() => syncConnector(selectedConnectorObj.id)} className={cx(btnPrimary, "h-9 px-3 text-xs")}>
                              Sync
                            </button>
                            <button onClick={() => setDetailsConnectorId(selectedConnectorObj.id)} className={cx(btnGhost, "h-9 px-2 text-xs")}>
                              Details
                            </button>
                          </div>

                          <div className="mt-3 text-xs">
                            {selectedConnectorObj.status === "ready" ? (
                              <span className="text-emerald-700 dark:text-emerald-200">Connected</span>
                            ) : selectedConnectorObj.status === "failed" ? (
                              <span className="text-rose-700 dark:text-rose-200">
                                Failed — {selectedConnectorObj.last_error ?? "see details"}
                              </span>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-300">Not ready</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          Select a store to enable actions.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* scoped overrides inside this one shell */}
                <style jsx global>{`
                  [data-connector-shell] .shadow,
                  [data-connector-shell] .shadow-sm,
                  [data-connector-shell] .shadow-md,
                  [data-connector-shell] .shadow-lg {
                    box-shadow: none !important;
                  }
                  [data-connector-shell] .bg-white:not(button):not(input):not(select):not(textarea) {
                    background: transparent !important;
                  }
                  [data-connector-shell] .border:not(button):not(input):not(select):not(textarea) {
                    border-color: transparent !important;
                  }
                `}</style>
              </div>
            </aside>

            {/* RIGHT: Upload + Command Bar */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold leading-tight text-slate-900 dark:text-slate-50">
                    Upload &{" "}
                    <span
                      className={cx(
                        "bg-clip-text text-transparent headline-grad",
                        "bg-[linear-gradient(90deg,rgba(34,211,238,1),rgba(56,189,248,1),rgba(52,211,153,1),rgba(244,114,182,1),rgba(250,204,21,1))]"
                      )}
                    >
                      Run Import
                    </span>
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Create an import job (upload or sync), then run your pipeline.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                    className={cx(btnGhost, "h-9 px-3 text-xs")}
                  >
                    Download sample CSV
                  </button>
                  <a href="/imports" className={cx(btnGhost, "h-9 px-3 text-xs")}>
                    Import history
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/35">
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

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/35">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-7">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Ingestion ID / Job
                    </label>
                    <div className="mt-1 grid grid-cols-12 gap-2">
                      <div className="col-span-9">
                        <input value={ingestionIdInput} onChange={(e) => setIngestionIdInput(e.target.value)} className={input} />
                      </div>
                      <div className="col-span-3">
                        <button
                          onClick={() => {
                            if (!ingestionIdInput) return toast.error("No ingestion id to delete");
                            setToDeleteIngestionId(ingestionIdInput);
                            setConfirmDeleteOpen(true);
                          }}
                          className={cx(btnGhost, "w-full")}
                          aria-label="Delete ingestion job"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Optional: Sync from store
                    </label>
                    <div className="mt-1 grid grid-cols-12 gap-2">
                      <div className="col-span-8">
                        <select value={selectedConnector} onChange={(e) => setSelectedConnector(e.target.value)} className={cx(select, "w-full")}>
                          <option value="">Select connector…</option>
                          {connectors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name ?? c.provider}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <button
                          onClick={() => {
                            if (selectedConnector) syncConnector(selectedConnector);
                            else toast.error("Select a connector");
                          }}
                          className={cx(btnPrimary, "w-full")}
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8">
                    <div className="flex flex-wrap items-center gap-5 pt-1">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={allowOverwriteExisting} onChange={(e) => setAllowOverwriteExisting(e.target.checked)} />
                        <span className="text-xs text-slate-700 dark:text-slate-200">Allow overwrite existing SKU</span>
                      </label>

                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={autoRunAfterUpload} onChange={(e) => setAutoRunAfterUpload(e.target.checked)} />
                        <span className="text-xs text-slate-700 dark:text-slate-200">Auto-run after upload</span>
                      </label>

                      <div className="flex items-center gap-2 flex-wrap">
                        <MappingPresetSelector
                          provider={selectedConnectorObj?.provider}
                          onSelect={(preset: any) => {
                            setMappingPreset(preset ?? null);
                            toast?.info?.("Mapping preset selected");
                          }}
                        />
                        {mappingPreset ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                            <span className="max-w-[260px] truncate">
                              {mappingPreset?.name ?? mappingPreset?.id ?? String(mappingPreset)}
                            </span>
                            <button
                              onClick={() => {
                                setMappingPreset(null);
                                toast?.info?.("Mapping preset cleared");
                              }}
                              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                            >
                              Clear
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <button onClick={() => runImport()} disabled={running} className={cx(btnPrimary, "w-full")} aria-label="Run import">
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

                {error ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-100">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline + artifact */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(148,163,184,0.18)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
          <div className="p-4 lg:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live pipeline</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Progress, module status, logs, and output refs.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Progress: {progress}%</div>
                <div className="h-2 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Pipeline modules</div>
                <div className="space-y-2">
                  {(pipelineSnapshot?.modules ?? [])
                    .slice()
                    .sort((a, b) => a.module_index - b.module_index)
                    .map((m) => (
                      <div
                        key={`${m.module_index}-${m.module_name}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/35"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.module_index}. {String(m.module_name)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            output_ref: <span className="font-mono">{m.output_ref ?? "—"}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusChipClass(m.status))}>
                            {m.status}
                          </div>
                          <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                            {fmtMs(moduleRuntime.get(m.module_name) ?? null)}
                          </div>
                          <button onClick={() => openModuleLogs(m.module_index)} className={cx(btnGhost, "h-9 mt-2 px-2 text-xs")}>
                            View logs
                          </button>
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

                <div className="pt-2">
                  <RecentRuns ingestionId={ingestionIdInput} pipelineId={pipelineRunId} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Import artifact</div>
                <pre className="max-h-[340px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
                  {importArtifact ? JSON.stringify(importArtifact, null, 2) : "Run an import to see artifact JSON."}
                </pre>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Download results</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() =>
                        downloadJson(`import-result-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, {
                          ingestionId: jobData?.id ?? ingestionIdInput ?? null,
                          pipelineRunId: pipelineRunId || null,
                          diagnostics_import: importDiag ?? null,
                          import_artifact: importArtifact ?? null,
                        })
                      }
                      className={cx(btnDark, "h-9 px-3 text-xs")}
                    >
                      Export JSON
                    </button>
                    <button onClick={() => downloadFailedRowsCsv(ingestionIdInput, toast)} className={cx(btnGhost, "h-9 px-3 text-xs")}>
                      Download failed rows
                    </button>
                    <a href="/imports" className={cx(btnGhost, "h-9 px-3 text-xs")}>
                      Import history
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ingestion viewer */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
          <div className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Ingestion (context)</h4>
              <div className="text-xs text-slate-500 dark:text-slate-400">Persisted diagnostics & raw payload</div>
            </div>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
              {jobData ? JSON.stringify(jobData, null, 2) : "Load an ingestion to view persisted diagnostics."}
            </pre>
          </div>
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

      {/* Connector details drawer */}
      <ConnectorDetailsDrawer
        integrationId={detailsConnectorId}
        isOpen={Boolean(detailsConnectorId)}
        onClose={() => setDetailsConnectorId("")}
      />

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
