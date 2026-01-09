"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import ImportRunDrawer from "@/components/import/ImportRunDrawer";
import { RecentRuns } from "@/components/import/RecentRuns";
import { MappingPresetSelector } from "@/components/import/MappingPresetSelector";

type AnyObj = Record<string, any>;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function statusChipClass(status: string) {
  switch (status) {
    case "running":
      return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-100 dark:border-cyan-500/30";
    case "succeeded":
    case "success":
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/40";
    case "failed":
    case "error":
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/45 dark:text-rose-100 dark:border-rose-500/40";
    case "queued":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-500/30";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700";
  }
}

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const router = useRouter();
  const toast = useToast();

  const [orgId, setOrgId] = useState<string>("");
  const [connectors, setConnectors] = useState<any[]>([]);
  const [detailsConnectorId, setDetailsConnectorId] = useState<string>("");

  const [mappingPreset, setMappingPreset] = useState<string>("default");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pipelineRunId, setPipelineRunId] = useState<string>("");
  const [runStatus, setRunStatus] = useState<string | null>(null);

  const [running, setRunning] = useState(false);

  const [uploadMode, setUploadMode] = useState<"csv" | "sync">("csv");
  const [ingestionIdInput, setIngestionIdInput] = useState<string>("");

  const btnGhost =
    "h-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 text-sm text-slate-800 shadow-sm hover:bg-white " +
    "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-950";

  const btnPrimary =
    "h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-950 shadow-sm transition " +
    "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:opacity-95 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 disabled:shadow-none";

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 shadow-sm outline-none " +
    "placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 " +
    "dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/15";

  async function fetchOrgAndConnectors() {
    try {
      const res = await fetch("/api/v1/me", { credentials: "same-origin" });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok && json.org_id) {
        setOrgId(json.org_id);
        const org = String(json.org_id);

        try {
          const r2 = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(org)}`, { credentials: "same-origin" });
          const j2 = await r2.json().catch(() => null);
          if (r2.ok && j2?.ok) setConnectors(j2.integrations ?? []);
          else setConnectors([]);
        } catch {
          setConnectors([]);
        }
        return;
      }

      setOrgId("");
      setConnectors([]);
    } catch {
      setOrgId("");
      setConnectors([]);
    }
  }

  useEffect(() => {
    fetchOrgAndConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRun = useMemo(() => Boolean(orgId), [orgId]);

  async function pollPipeline(runId: string) {
    if (!runId) return;

    setRunning(true);
    setRunStatus("running");

    try {
      const start = Date.now();
      while (Date.now() - start < 1000 * 60 * 10) {
        const res = await fetch(`/api/v1/pipeline_runs/${encodeURIComponent(runId)}`, { credentials: "same-origin" });
        const json = await res.json().catch(() => null);

        const st = json?.pipeline_run?.status ?? json?.status ?? null;
        if (st) setRunStatus(String(st));

        if (st && ["succeeded", "success", "completed", "failed", "error"].includes(String(st))) {
          setRunning(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      setRunning(false);
      setRunStatus((s) => s ?? "running");
    } catch {
      setRunning(false);
      setRunStatus("error");
    }
  }

  async function startSyncFromStore() {
    if (!orgId) {
      toast.error("Org is not loaded.");
      return;
    }

    // If you have a specific integration selection UX, it should live on /integrations.
    // Here we just route the user there to connect or manage a store, then return to Import.
    router.push("/integrations");
  }

  async function createImportJobFromUpload(file: File) {
    if (!orgId) {
      toast.error("Org is not loaded.");
      return;
    }

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("org_id", orgId);
      form.append("mapping_preset", mappingPreset);

      const res = await fetch("/api/v1/import/jobs/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Upload failed");
        return;
      }

      setIngestionIdInput(String(json.import_job_id ?? json.ingestion_id ?? ""));
      toast.success("Import job created");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function runPipeline() {
    if (!orgId) {
      toast.error("Org is not loaded.");
      return;
    }

    if (!ingestionIdInput) {
      toast.error("Missing import job ID.");
      return;
    }

    try {
      setRunning(true);
      setRunStatus("queued");

      const res = await fetch("/api/v1/import/run", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          import_job_id: ingestionIdInput,
          mapping_preset: mappingPreset,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setRunning(false);
        setRunStatus("error");
        toast.error(json?.error ?? "Run failed");
        return;
      }

      const runId = String(json.pipeline_run_id ?? "");
      setPipelineRunId(runId);
      setDrawerOpen(true);
      toast.success("Pipeline started");

      await pollPipeline(runId);
    } catch (err: any) {
      setRunning(false);
      setRunStatus("error");
      toast.error(String(err?.message ?? err));
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-36 -left-28 h-72 w-72 rounded-full bg-cyan-300/22 blur-3xl dark:bg-cyan-500/14" />
        <div className="absolute -top-40 right-[-10rem] h-64 w-64 rounded-full bg-fuchsia-300/14 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute -bottom-52 right-[-12rem] h-80 w-80 rounded-full bg-emerald-300/16 blur-3xl dark:bg-emerald-500/10" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top, rgba(248,250,252,0) 0%, rgba(248,250,252,0.92) 55%, rgba(248,250,252,1) 100%)",
          }}
        />

        {/* faint grid overlay */}
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]">
          <div
            style={{
              height: "100%",
              width: "100%",
              background:
                "linear-gradient(to right, rgba(229,231,235,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,1) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Top bar */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-300">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-white border border-cyan-200 dark:bg-slate-900 dark:border-cyan-400/30">
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

            <div className="text-xs text-slate-600 dark:text-slate-300">
              Store:{" "}
              <span
                className={cx(
                  "ml-2 inline-flex items-center gap-2 rounded-full border px-2 py-0.5",
                  connectors?.length
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/40"
                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700"
                )}
                title={connectors?.length ? "At least one store integration is available." : "No store integration connected yet."}
              >
                <span
                  className={cx(
                    "h-1.5 w-1.5 rounded-full",
                    connectors?.length ? "bg-emerald-400" : "bg-slate-400 dark:bg-slate-600"
                  )}
                />
                {connectors?.length ? "connected" : "disconnected"}
              </span>
            </div>

            <button onClick={() => router.push("/integrations")} className={cx(btnPrimary, "h-8 px-3 text-xs")}>
              Connect a store
            </button>
          </div>
        </section>

        {/* Primary workspace */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(148,163,184,0.22)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 dark:shadow-[0_18px_45px_rgba(2,6,23,0.6)]">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-5 lg:p-5">
            {/* RIGHT: Upload + Command Bar */}
            <div className="lg:col-span-12 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
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
                      fetchOrgAndConnectors();
                      toast.success("Refreshed");
                    }}
                    className={cx(btnGhost, "h-9 px-3 text-xs")}
                  >
                    Refresh
                  </button>

                  <button
                    onClick={() => setDrawerOpen(true)}
                    className={cx(btnGhost, "h-9 px-3 text-xs")}
                    disabled={!pipelineRunId}
                    title={!pipelineRunId ? "Run the pipeline to see details" : "Open run details"}
                  >
                    View run
                  </button>

                  <button onClick={runPipeline} className={cx(btnPrimary, "h-9 px-3 text-xs")} disabled={!canRun || running}>
                    {running ? "Running…" : "Run pipeline"}
                  </button>
                </div>
              </div>

              {/* Mode switch */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Create import job</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Upload a CSV or sync from a connected store.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={cx(
                        "h-9 rounded-xl px-3 text-xs font-semibold border shadow-sm",
                        uploadMode === "csv"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-950"
                      )}
                      onClick={() => setUploadMode("csv")}
                    >
                      Upload CSV
                    </button>
                    <button
                      className={cx(
                        "h-9 rounded-xl px-3 text-xs font-semibold border shadow-sm",
                        uploadMode === "sync"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-950"
                      )}
                      onClick={() => setUploadMode("sync")}
                    >
                      Sync from store
                    </button>
                  </div>
                </div>

                {uploadMode === "csv" ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Mapping preset</div>
                      <MappingPresetSelector value={mappingPreset} onChange={setMappingPreset} />
                    </div>

                    <div className="lg:col-span-8">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Upload</div>
                      <label className="block">
                        <input
                          className="hidden"
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) createImportJobFromUpload(f);
                          }}
                        />
                        <div
                          className={cx(
                            "group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm hover:bg-white",
                            "dark:border-slate-800 dark:bg-slate-950/35 dark:hover:bg-slate-950"
                          )}
                        >
                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            Choose a CSV file to create an import job
                          </div>
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                            Browse
                          </div>
                        </div>
                      </label>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        After upload, the import job ID will appear below.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm text-slate-700 dark:text-slate-200">
                        Sync requires a connected store integration.
                      </div>
                      <button
                        onClick={startSyncFromStore}
                        className={cx(btnPrimary, "h-9 px-3 text-xs")}
                        disabled={!orgId}
                        title={!orgId ? "Org not loaded" : "Go to integrations to connect a store"}
                      >
                        Go to integrations
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">
                      Connected integrations:{" "}
                      <span className="font-semibold">{connectors?.length ? connectors.length : 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Run details */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Import job ID</div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Paste an existing import job ID or use the one created above.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        className={inputClass}
                        value={ingestionIdInput}
                        onChange={(e) => setIngestionIdInput(e.target.value)}
                        placeholder="import_job_id (or ingestion id)"
                      />
                      <button
                        onClick={() => {
                          if (!ingestionIdInput) return toast.error("Missing import job ID.");
                          toast.success("Import job ID set");
                        }}
                        className={cx(btnGhost, "shrink-0 h-10 px-3 text-xs")}
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Recent runs</div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Quickly open or inspect recent pipeline executions.
                        </p>
                      </div>
                      <button onClick={() => fetchOrgAndConnectors()} className={cx(btnGhost, "h-9 px-3 text-xs")}>
                        Refresh
                      </button>
                    </div>

                    <div className="mt-3">
                      <RecentRuns
                        orgId={orgId}
                        onOpen={(runId: string) => {
                          setPipelineRunId(runId);
                          setDrawerOpen(true);
                          pollPipeline(runId);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Run pipeline</div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Starts the pipeline using the import job and mapping preset.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => router.push("/dashboard")}
                          className={cx(btnGhost, "h-9 px-3 text-xs")}
                          title="Back to dashboard"
                        >
                          Dashboard
                        </button>

                        <button
                          onClick={runPipeline}
                          className={cx(btnPrimary, "h-9 px-3 text-xs")}
                          disabled={!canRun || running || !ingestionIdInput}
                          title={!ingestionIdInput ? "Set an import job ID first" : ""}
                        >
                          {running ? "Running…" : "Run now"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Org</div>
                        <div className="mt-1 font-mono text-xs">{orgId ? orgId : "—"}</div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-200">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mapping preset</div>
                        <div className="mt-1 font-mono text-xs">{mappingPreset}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Quick actions</div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Open run details and manage connected stores (on the Integrations page).
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setDrawerOpen(true)}
                          className={cx(btnGhost, "h-9 px-3 text-xs")}
                          disabled={!pipelineRunId}
                          title={!pipelineRunId ? "Run the pipeline first" : "Open run drawer"}
                        >
                          View run
                        </button>

                        <button
                          onClick={() => router.push("/integrations")}
                          className={cx(btnPrimary, "h-9 px-3 text-xs")}
                          title="Go to Integrations"
                        >
                          Integrations
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-300">
                      Store connections detected: <span className="font-semibold">{connectors?.length ?? 0}</span>
                      {connectors?.length ? (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          (manage / test / sync on Integrations)
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Drawer: pipeline run details */}
      <ImportRunDrawer
        orgId={orgId}
        runId={pipelineRunId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Existing connector drawer (kept for compatibility if invoked elsewhere) */}
      <ConnectorDetailsDrawer
        integrationId={detailsConnectorId}
        isOpen={Boolean(detailsConnectorId)}
        onClose={() => setDetailsConnectorId("")}
      />
    </main>
  );
}
