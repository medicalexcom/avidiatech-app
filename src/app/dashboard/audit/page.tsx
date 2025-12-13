"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * AvidiaAudit workspace (client)
 *
 * Goals:
 * - Above-the-fold CTA (URL + Run buttons)
 * - Two modes:
 *   1) Run from URL: ingest → poll → pipeline(extract+seo+audit)
 *   2) Run on existing ingestionId: pipeline(audit) OR pipeline(extract+seo+audit) selectable
 * - Live pipeline telemetry (status, progress, module runtimes, output_refs)
 * - Audit dashboard (score, pass/fail, blockers/warnings, checks table)
 * - Raw JSON viewer + export
 *
 * Notes:
 * - Audit persistence is stored at product_ingestions.diagnostics.audit
 * - Durable artifacts are stored in pipeline-outputs and linked via module_runs.output_ref
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
  run?: {
    id: string;
    status: PipelineRunStatus;
    created_at?: string;
    started_at?: string;
    finished_at?: string;
  } & AnyObj;
  modules?: PipelineModule[];
};

type Mode = "url" | "ingestion";
type IngestionAuditMode = "audit_only" | "extract_seo_audit";

const STEPS_URL_FLOW = ["extract", "seo", "audit"] as const;
const STEPS_AUDIT_ONLY = ["audit"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtMs(ms: number | null) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
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

function badgeClassForSeverity(sev: string) {
  const s = (sev || "").toLowerCase();
  if (s === "critical" || s === "blocker" || s === "high" || s === "error") {
    return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-500/40";
  }
  if (s === "warn" || s === "warning" || s === "medium") {
    return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-500/40";
  }
  return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500/40";
}

function statusChipClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "running")
    return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-500/40";
  if (s === "failed")
    return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-500/40";
  if (s === "succeeded" || s === "completed")
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500/40";
  if (s === "skipped")
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800";
}

/**
 * Shape-detection so this page doesn't hardcode a strict audit schema.
 * Our current minimal audit lives at diagnostics.audit:
 *   { status, score, blockers[], warnings[], summary, checks[] }
 */
function normalizeAudit(auditAny: any) {
  const audit = auditAny ?? null;
  if (!audit || typeof audit !== "object") {
    return {
      ok: null as boolean | null,
      status: null as string | null,
      score: null as number | null,
      summary: null as string | null,
      blockers: [] as string[],
      warnings: [] as string[],
      checks: [] as any[],
      categories: [] as Array<{
        key: string;
        label: string;
        score: number | null;
        status: string | null;
      }>,
      issues: [] as Array<any>,
      raw: auditAny ?? null,
      lastRunAt: null as string | null,
    };
  }

  const score = typeof audit.score === "number" ? audit.score : null;

  const status =
    typeof audit.status === "string"
      ? audit.status
      : typeof audit.state === "string"
      ? audit.state
      : null;

  const ok =
    typeof audit.ok === "boolean"
      ? audit.ok
      : status
      ? ["passed", "ok", "success", "completed"].includes(status.toLowerCase())
      : null;

  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const warnings = Array.isArray(audit.warnings) ? audit.warnings : [];

  const issues = Array.isArray(audit.issues)
    ? audit.issues
    : Array.isArray(audit.findings)
    ? audit.findings
    : [];

  const checks = Array.isArray(audit.checks) ? audit.checks : [];

  const categoriesRaw = audit.categories || audit.categoryScores || null;
  const categories =
    Array.isArray(categoriesRaw)
      ? categoriesRaw.map((c: any, idx: number) => ({
          key: String(c.key ?? c.name ?? idx),
          label: String(c.label ?? c.name ?? c.key ?? `Category ${idx + 1}`),
          score: typeof c.score === "number" ? c.score : null,
          status: typeof c.status === "string" ? c.status : null,
        }))
      : [];

  const summary = typeof audit.summary === "string" ? audit.summary : null;
  const lastRunAt =
    typeof audit.last_run_at === "string"
      ? audit.last_run_at
      : typeof audit.lastRunAt === "string"
      ? audit.lastRunAt
      : typeof audit.updated_at === "string"
      ? audit.updated_at
      : null;

  return {
    ok,
    status,
    score,
    summary,
    blockers,
    warnings,
    checks,
    categories,
    issues,
    raw: audit,
    lastRunAt,
  };
}

/** tiny UI helpers (no deps) */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ProgressRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative h-12 w-12 shrink-0 rounded-full border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-950/50"
      style={{
        background: `conic-gradient(from 225deg, rgba(34,211,238,0.95) ${v}%, rgba(226,232,240,1) 0)`,
      }}
      aria-label={`Progress ${v}%`}
      title={`Progress ${v}%`}
    >
      <div className="absolute inset-1.5 rounded-full bg-slate-50 dark:bg-slate-950" />
      <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">
        {v}%
      </div>
    </div>
  );
}

export default function AuditPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const urlParam = params?.get("url") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";

  const [mode, setMode] = useState<Mode>(urlParam ? "url" : "ingestion");
  const [ingestionAuditMode, setIngestionAuditMode] =
    useState<IngestionAuditMode>("extract_seo_audit");

  const [urlInput, setUrlInput] = useState(urlParam || "");
  const [ingestionIdInput, setIngestionIdInput] = useState(ingestionIdParam || "");

  const [job, setJob] = useState<any | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string>(pipelineRunIdParam || "");
  const [pipelineSnapshot, setPipelineSnapshot] = useState<PipelineSnapshot | null>(null);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Debug/polling
  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  const [showRawAuditJson, setShowRawAuditJson] = useState(false);
  const [issueFilter, setIssueFilter] = useState<"all" | "errors" | "warnings">("all");
  const [search, setSearch] = useState("");
  const [showDevPanels, setShowDevPanels] = useState(false);

  const fetchIngestionData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error?.message || json?.error || `Ingest fetch failed: ${res.status}`);
      setJob(json?.data ?? json);
      return json?.data ?? json;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPipelineSnapshot = useCallback(async (runId: string) => {
    const res = await fetch(`/api/v1/pipeline/run/${encodeURIComponent(runId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok)
      throw new Error(json?.error?.message || json?.error || `Pipeline fetch failed: ${res.status}`);
    return json as PipelineSnapshot;
  }, []);

  async function pollPipeline(runId: string, timeoutMs = 300_000, intervalMs = 2000) {
    const start = Date.now();
    setStatusMessage("Pipeline running");
    while (Date.now() - start < timeoutMs) {
      const snap = await fetchPipelineSnapshot(runId);
      setPipelineSnapshot(snap);
      const s = snap?.run?.status;
      if (s === "succeeded" || s === "failed") return snap;
      await sleep(intervalMs);
    }
    throw new Error("Pipeline did not complete within timeout");
  }

  async function pollForIngestion(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
      if (res.status === 200) {
        const j = await res.json();
        setPollingState(`completed: ingestionId=${j.ingestionId}`);
        setStatusMessage("Ingestion completed");
        return j;
      }
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setPollingState(`waiting... ${elapsed}s`);
      await sleep(intervalMs);
    }
    setPollingState("timeout");
    setStatusMessage(null);
    throw new Error("Ingestion did not complete within timeout");
  }

  async function createIngestion(url: string) {
    if (!url) throw new Error("Please enter a URL");

    setRawIngestResponse(null);
    setPollingState(null);
    setStatusMessage("Submitting ingestion");

    const res = await fetch("/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        persist: true,
        options: { includeSeo: true },
      }),
    });

    const json = await res.json().catch(() => null);
    setRawIngestResponse({ status: res.status, body: json });
    if (!res.ok) throw new Error(json?.error?.message || json?.error || `Ingest failed: ${res.status}`);

    const possibleIngestionId =
      json?.ingestionId ?? json?.id ?? json?.data?.id ?? json?.data?.ingestionId ?? null;

    if (possibleIngestionId) {
      if (json?.status === "accepted" || res.status === 202) {
        const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId) throw new Error("Ingest did not return an ingestionId or jobId. See debug.");
    const pollResult = await pollForIngestion(jobId, 120_000, 3000);
    const newId = pollResult?.ingestionId ?? pollResult?.id ?? null;
    if (!newId) throw new Error("Polling returned no ingestionId.");
    return newId;
  }

  async function startPipeline(ingestionId: string, steps: string[]) {
    setStatusMessage("Starting pipeline");
    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingestionId,
        triggerModule: "audit",
        steps,
        options: {},
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok)
      throw new Error(json?.error?.message || json?.error || `Pipeline start failed: ${res.status}`);
    const runId = String(json?.pipelineRunId ?? "");
    if (!runId) throw new Error("Pipeline start did not return pipelineRunId");
    setPipelineRunId(runId);
    return runId;
  }

  async function runAuditFromUrl() {
    if (running) return;
    setRunning(true);
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);

    try {
      const ingestionId = await createIngestion(urlInput);
      setIngestionIdInput(ingestionId);

      router.push(
        `/dashboard/audit?url=${encodeURIComponent(urlInput)}&ingestionId=${encodeURIComponent(ingestionId)}`
      );

      await fetchIngestionData(ingestionId);
      const runId = await startPipeline(ingestionId, [...STEPS_URL_FLOW]);
      router.push(
        `/dashboard/audit?url=${encodeURIComponent(urlInput)}&ingestionId=${encodeURIComponent(
          ingestionId
        )}&pipelineRunId=${encodeURIComponent(runId)}`
      );

      await pollPipeline(runId, 300_000, 2000);
      await fetchIngestionData(ingestionId);

      setStatusMessage("Audit completed");
    } catch (e: any) {
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setRunning(false);
      setPollingState(null);
    }
  }

  async function runAuditOnIngestion() {
    if (running) return;
    setRunning(true);
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);

    try {
      const id = ingestionIdInput.trim();
      if (!id) throw new Error("Please enter an ingestionId");

      router.push(`/dashboard/audit?ingestionId=${encodeURIComponent(id)}`);

      await fetchIngestionData(id);

      const steps = ingestionAuditMode === "audit_only" ? [...STEPS_AUDIT_ONLY] : [...STEPS_URL_FLOW];

      const runId = await startPipeline(id, steps);
      router.push(
        `/dashboard/audit?ingestionId=${encodeURIComponent(id)}&pipelineRunId=${encodeURIComponent(runId)}`
      );

      await pollPipeline(runId, 300_000, 2000);
      await fetchIngestionData(id);

      setStatusMessage("Audit completed");
    } catch (e: any) {
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setRunning(false);
      setPollingState(null);
    }
  }

  // initial load if ingestionId is present
  useEffect(() => {
    if (!ingestionIdParam) return;
    (async () => {
      try {
        await fetchIngestionData(ingestionIdParam);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionIdParam]);

  // load pipeline snapshot if pipelineRunId present
  useEffect(() => {
    if (!pipelineRunIdParam) return;
    (async () => {
      try {
        const snap = await fetchPipelineSnapshot(pipelineRunIdParam);
        setPipelineSnapshot(snap);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineRunIdParam]);

  const jobData = useMemo(() => {
    if (!job) return null;
    if ((job as any)?.data?.data) return (job as any).data.data;
    if ((job as any)?.data) return (job as any).data;
    return job;
  }, [job]);

  const auditDiagnostics = jobData?.diagnostics?.audit ?? null;
  const audit = useMemo(() => normalizeAudit(auditDiagnostics), [auditDiagnostics]);

  const runStatus = pipelineSnapshot?.run?.status ?? null;

  const moduleRuntimeMs = useMemo(() => {
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
    let done = 0;
    for (const m of mods) if (["succeeded", "failed", "skipped"].includes(m.status)) done++;
    return Math.round((done / mods.length) * 100);
  }, [pipelineSnapshot]);

  const derivedIssues = useMemo(() => {
    const issues: any[] = [];
    for (const b of audit.blockers ?? []) {
      issues.push({ severity: "blocker", rule: "blocker", message: b, location: "audit" });
    }
    for (const w of audit.warnings ?? []) {
      issues.push({ severity: "warning", rule: "warning", message: w, location: "audit" });
    }
    for (const it of audit.issues ?? []) issues.push(it);
    return issues;
  }, [audit.blockers, audit.issues, audit.warnings]);

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return derivedIssues.filter((i) => {
      const sev = String(i?.severity ?? i?.level ?? "").toLowerCase();
      if (issueFilter === "errors") {
        if (
          !(
            sev.includes("block") ||
            sev.includes("crit") ||
            sev.includes("high") ||
            sev.includes("error") ||
            sev.includes("fail")
          )
        ) {
          return false;
        }
      }
      if (issueFilter === "warnings") {
        if (!(sev.includes("warn") || sev.includes("medium"))) return false;
      }
      if (!term) return true;
      const hay = `${i?.rule ?? ""} ${i?.message ?? ""} ${i?.location ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [derivedIssues, issueFilter, search]);

  const scoreTone =
    audit.score == null ? "slate" : audit.score >= 90 ? "emerald" : audit.score >= 75 ? "amber" : "rose";

  const scoreChipClass =
    scoreTone === "emerald"
      ? "bg-emerald-500/10 border-emerald-400/60 text-emerald-700 dark:text-emerald-200"
      : scoreTone === "amber"
      ? "bg-amber-500/10 border-amber-400/60 text-amber-700 dark:text-amber-200"
      : scoreTone === "rose"
      ? "bg-rose-500/10 border-rose-400/60 text-rose-700 dark:text-rose-200"
      : "bg-slate-500/10 border-slate-400/60 text-slate-700 dark:text-slate-200";

  const downloadableAuditJson = useMemo(() => {
    return {
      ingestionId: jobData?.id ?? ingestionIdInput ?? null,
      pipelineRunId: pipelineRunId || null,
      audit: audit.raw ?? null,
      diagnostics_audit: auditDiagnostics ?? null,
      pipeline: pipelineSnapshot ?? null,
    };
  }, [audit.raw, auditDiagnostics, ingestionIdInput, jobData?.id, pipelineRunId, pipelineSnapshot]);

  const downloadJson = (filename: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Copied to clipboard");
      setTimeout(() => setStatusMessage(null), 1500);
    } catch {
      // silent (no blocking)
    }
  };

  const demoUrl = "https://www.apple.com/iphone-17/";

  const ingestionId = String(jobData?.id ?? ingestionIdInput ?? "");
  const blockersCount = (audit.blockers ?? []).length;
  const warningsCount = (audit.warnings ?? []).length;
  const checksCount = Array.isArray(audit.checks) ? audit.checks.length : 0;

  const headerState =
    running || loading || pollingState || runStatus === "running"
      ? "Running…"
      : pipelineRunId
      ? "Ready"
      : "Idle";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background — SEO-style cyan/emerald */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute -bottom-44 right-[-12rem] h-96 w-96 rounded-full bg-emerald-300/18 blur-3xl dark:bg-emerald-500/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.035] mix-blend-soft-light dark:opacity-[0.07]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Top bar */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-50 border border-cyan-200 dark:bg-slate-900 dark:border-cyan-400/30">
                <span className={cx("h-1.5 w-1.5 rounded-full", running ? "bg-amber-400 animate-pulse" : "bg-cyan-400")} />
              </span>
              Data Intelligence · AvidiaAudit
              {ingestionId ? (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <button
                    type="button"
                    onClick={() => copyText(ingestionId)}
                    className="font-mono text-[10px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    title="Copy ingestionId"
                  >
                    {ingestionId.slice(0, 8)}…
                  </button>
                </>
              ) : null}
              {pipelineRunId ? (
                <>
                  <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                  <button
                    type="button"
                    onClick={() => copyText(pipelineRunId)}
                    className="font-mono text-[10px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    title="Copy pipelineRunId"
                  >
                    run:{pipelineRunId.slice(0, 8)}…
                  </button>
                </>
              ) : null}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              {headerState}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusMessage ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] text-cyan-800 shadow-sm dark:border-cyan-500/30 dark:bg-slate-950/70 dark:text-cyan-100">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {statusMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={async () => {
                try {
                  setError(null);
                  if (!pipelineRunId) return;
                  const snap = await fetchPipelineSnapshot(pipelineRunId);
                  setPipelineSnapshot(snap);
                  setStatusMessage("Snapshot refreshed");
                  setTimeout(() => setStatusMessage(null), 1500);
                } catch (e: any) {
                  setError(String(e?.message || e));
                }
              }}
              disabled={!pipelineRunId || running}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm hover:bg-white disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950"
              title="Refresh pipeline snapshot"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowDevPanels((v) => !v)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              {showDevPanels ? "Hide dev panels" : "Show dev panels"}
            </button>
          </div>
        </section>

        {/* Hero / CTA + Scoreboard */}
        <section className="rounded-3xl border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(148,163,184,0.22)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 dark:shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-5 lg:p-5">
            {/* Left: headline + run */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                  Turn your product rules into a{" "}
                  <span
                    className="audit-title-gradient bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(251,191,36,1), rgba(249,115,22,1), rgba(236,72,153,1), rgba(251,191,36,1))",
                    }}
                  >
                    measurable, enforceable audit score
                  </span>
                  .
                </h1>
                <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Run deterministic checks now (v1), persist a structured audit payload, and use it as a guardrail for
                  safe automation. When audit fails, downstream modules can be skipped automatically.
                </p>
              </div>

              {/* quick chips */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                  <span className="font-mono text-slate-600 dark:text-slate-300">URL flow</span>
                  <span className="text-slate-500 dark:text-slate-400">ingest → extract → seo → audit</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                  <span className="font-mono text-slate-600 dark:text-slate-300">Ingestion flow</span>
                  <span className="text-slate-500 dark:text-slate-400">audit-only or full chain</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  auditResult JSON per run
                </span>
              </div>

              {/* Run mode */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Run mode
                  </div>

                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-[11px] dark:border-slate-800 dark:bg-slate-950/60">
                    <button
                      type="button"
                      className={cx(
                        "px-3 py-1 rounded-full transition",
                        mode === "url"
                          ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      )}
                      onClick={() => setMode("url")}
                    >
                      From URL
                    </button>
                    <button
                      type="button"
                      className={cx(
                        "px-3 py-1 rounded-full transition",
                        mode === "ingestion"
                          ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      )}
                      onClick={() => setMode("ingestion")}
                    >
                      From ingestionId
                    </button>
                  </div>
                </div>

                {mode === "url" ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Manufacturer Product URL
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://manufacturer.com/product/..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
                        type="url"
                      />
                      <button
                        type="button"
                        onClick={runAuditFromUrl}
                        disabled={running}
                        className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:w-48 bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
                      >
                        {running ? "Running…" : "Run Audit"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-500">
                        Creates an ingestion + pipeline run, then persists an audit result to diagnostics.
                      </p>
                      <button
                        type="button"
                        className="text-[11px] text-cyan-700 hover:text-cyan-600 underline underline-offset-4 dark:text-cyan-300 dark:hover:text-cyan-200"
                        onClick={() => setUrlInput(demoUrl)}
                      >
                        Try demo URL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      ingestionId
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={ingestionIdInput}
                        onChange={(e) => setIngestionIdInput(e.target.value)}
                        placeholder="b0324634-1593-4fad-a9de-70215a2deb38"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
                        type="text"
                      />
                      <button
                        type="button"
                        onClick={runAuditOnIngestion}
                        disabled={running}
                        className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:w-48 bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
                      >
                        {running ? "Running…" : "Run Audit"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">Steps:</span>
                        <select
                          value={ingestionAuditMode}
                          onChange={(e) => setIngestionAuditMode(e.target.value as IngestionAuditMode)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-950/60"
                        >
                          <option value="extract_seo_audit">extract + seo + audit</option>
                          <option value="audit_only">audit only</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-[11px] text-slate-500 hover:text-slate-700 underline underline-offset-4 dark:text-slate-400 dark:hover:text-slate-200"
                          onClick={async () => {
                            try {
                              setError(null);
                              if (!ingestionIdInput.trim()) throw new Error("Enter an ingestionId first.");
                              await fetchIngestionData(ingestionIdInput.trim());
                              setStatusMessage("Loaded ingestion");
                            } catch (e: any) {
                              setError(String(e?.message || e));
                            }
                          }}
                        >
                          Load existing
                        </button>
                        {ingestionIdInput ? (
                          <button
                            type="button"
                            className="text-[11px] text-slate-500 hover:text-slate-700 underline underline-offset-4 dark:text-slate-400 dark:hover:text-slate-200"
                            onClick={() => copyText(ingestionIdInput)}
                          >
                            Copy id
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-50">
                  {error}
                </div>
              ) : null}
            </div>

            {/* Right: score + live stats */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Audit scoreboard
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cx(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
                          scoreChipClass
                        )}
                      >
                        {audit.score == null ? "—" : `${audit.score} / 100`}
                      </span>

                      <span
                        className={cx(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]",
                          statusChipClass(
                            audit.status ?? (audit.ok === true ? "passed" : audit.ok === false ? "failed" : "unknown")
                          )
                        )}
                      >
                        {audit.status ?? (audit.ok === true ? "passed" : audit.ok === false ? "failed" : "unknown")}
                      </span>

                      {blockersCount ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          {blockersCount} blockers
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          No blockers
                        </span>
                      )}

                      {warningsCount ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/35 dark:text-amber-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {warningsCount} warnings
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {audit.summary ?? "Run an audit to see a score, categories, and structured results."}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <ProgressRing value={pipelineSnapshot?.modules?.length ? progress : 0} />
                    <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                      <div>Last audit</div>
                      <div className="font-mono">
                        {audit.lastRunAt ? new Date(audit.lastRunAt).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Pipeline progress</span>
                    <span>{pipelineSnapshot?.modules?.length ? `${progress}%` : "—"}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Categories (if present) */}
                {audit.categories?.length ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Category scores
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {audit.categories.length} categories
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {audit.categories.slice(0, 6).map((c) => {
                        const v = c.score == null ? 0 : Math.max(0, Math.min(100, c.score));
                        return (
                          <div key={c.key} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="truncate text-slate-700 dark:text-slate-200">{c.label}</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {c.score == null ? "—" : `${c.score}`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
                                style={{ width: `${v}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Gate status */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  <div className="font-semibold">Gate policy</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">
                    If audit fails: <span className="font-semibold">Import</span>,{" "}
                    <span className="font-semibold">Monitor</span>, and <span className="font-semibold">Price</span> are
                    skipped automatically.
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(`audit-${jobData?.id ?? ingestionIdInput ?? "unknown"}.json`, downloadableAuditJson)
                    }
                    className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs text-slate-50 shadow-sm hover:bg-slate-800 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRawAuditJson((v) => !v)}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    {showRawAuditJson ? "Hide raw" : "Show raw"}
                  </button>

                  {pipelineRunId ? (
                    <button
                      type="button"
                      onClick={() => copyText(JSON.stringify(downloadableAuditJson, null, 2))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                      title="Copy full JSON payload"
                    >
                      Copy payload
                    </button>
                  ) : null}
                </div>

                {showRawAuditJson ? (
                  <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] text-slate-100 dark:border-slate-800">
                    {JSON.stringify(downloadableAuditJson, null, 2)}
                  </pre>
                ) : null}

                {/* tiny live footer */}
                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Checks: {checksCount || "—"}</span>
                  <span>{pollingState ? `Ingest: ${pollingState}` : runStatus ? `Run: ${runStatus}` : ""}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body: pipeline + issues/checks */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Live pipeline */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live pipeline</h2>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Status, runtime, output refs — in the order your pipeline executed.
                </p>
              </div>
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]",
                  statusChipClass(runStatus ?? "idle")
                )}
              >
                {runStatus ?? "idle"}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {(pipelineSnapshot?.modules ?? [])
                .slice()
                .sort((a, b) => a.module_index - b.module_index)
                .map((m) => (
                  <div
                    key={`${m.module_index}-${m.module_name}`}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "h-2 w-2 rounded-full",
                            m.status === "succeeded"
                              ? "bg-emerald-400"
                              : m.status === "failed"
                              ? "bg-rose-400"
                              : m.status === "running"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-slate-400"
                          )}
                        />
                        <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {m.module_index}. {moduleLabel(m.module_name)}
                        </div>
                        <span
                          className={cx(
                            "ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                            statusChipClass(m.status)
                          )}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono">
                          {fmtMs(moduleRuntimeMs.get(m.module_name) ?? null)}
                        </span>
                        <span className="h-3 w-px bg-slate-300/70 dark:bg-slate-700/70" />
                        <span className="truncate">
                          output_ref:{" "}
                          <span className="font-mono text-slate-600 dark:text-slate-300">
                            {m.output_ref ?? "—"}
                          </span>
                        </span>
                        {m.output_ref ? (
                          <button
                            type="button"
                            onClick={() => copyText(String(m.output_ref))}
                            className="ml-auto rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-950"
                            title="Copy output_ref"
                          >
                            Copy
                          </button>
                        ) : null}
                      </div>

                      {m.error ? (
                        <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-200">
                          error: {typeof m.error === "string" ? m.error : JSON.stringify(m.error)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

              {!(pipelineSnapshot?.modules ?? []).length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                  No pipeline run selected yet. Run an audit to see module telemetry.
                </div>
              ) : null}
            </div>
          </div>

          {/* Issues + Checks */}
          <div className="lg:col-span-7 space-y-4">
            {/* Issues */}
            <div className="rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Issues</h2>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Blockers and warnings (v1). Filter, search, and export for workflows.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={issueFilter}
                    onChange={(e) => setIssueFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <option value="all">All</option>
                    <option value="errors">Errors/Blockers</option>
                    <option value="warnings">Warnings</option>
                  </select>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search issues…"
                    className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-950/60"
                  />
                </div>
              </div>

              <div className="mt-3 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-950/80 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Severity</th>
                      <th className="px-3 py-2 text-left font-semibold">Rule</th>
                      <th className="px-3 py-2 text-left font-semibold">Message</th>
                      <th className="px-3 py-2 text-left font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900/30">
                    {filteredIssues.length ? (
                      filteredIssues.map((i, idx) => {
                        const sev = String(i?.severity ?? i?.level ?? "info");
                        return (
                          <tr
                            key={idx}
                            className="border-t border-slate-200 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-950/40"
                          >
                            <td className="px-3 py-2">
                              <span
                                className={cx(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                                  badgeClassForSeverity(sev)
                                )}
                              >
                                {sev}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                              {String(i?.rule ?? i?.key ?? "—")}
                            </td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                              {String(i?.message ?? i?.detail ?? i?.text ?? "—")}
                            </td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                              {String(i?.location ?? i?.path ?? "—")}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-slate-500 dark:text-slate-400" colSpan={4}>
                          No issues found (or run an audit to populate results).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Current v1 audit derives issues from blockers/warnings. Future audit can emit richer issue objects.
              </div>
            </div>

            {/* Checks */}
            <div className="rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Checks</h2>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    A per-check view you can trust for “go / no-go”.
                  </p>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {Array.isArray(audit.checks) ? `${audit.checks.length} checks` : "—"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(audit.checks ?? []).map((c: any, idx: number) => {
                  const st = String(c?.status ?? "pass");
                  const badge =
                    st === "fail"
                      ? badgeClassForSeverity("error")
                      : st === "warn"
                      ? badgeClassForSeverity("warning")
                      : badgeClassForSeverity("ok");

                  return (
                    <div
                      key={`${c?.key ?? idx}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                            {String(c?.label ?? c?.key ?? `Check ${idx + 1}`)}
                          </div>
                          {c?.detail ? (
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {String(c.detail)}
                            </div>
                          ) : null}
                        </div>

                        <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]", badge)}>
                          {st}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!(audit.checks ?? []).length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    No checks available yet. Run an audit to populate.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Dev panels (collapsed by default) */}
        {showDevPanels ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Normalized payload</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Ingestion</span>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
                {jobData ? JSON.stringify(jobData.normalized_payload ?? jobData, null, 2) : "Run an audit to load ingestion data."}
              </pre>
            </div>

            <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Raw /api/v1/ingest</h3>
                {pollingState ? <span className="text-[11px] text-slate-500 dark:text-slate-400">{pollingState}</span> : null}
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-[11px] text-slate-100 dark:bg-slate-950/70">
                {rawIngestResponse ? JSON.stringify(rawIngestResponse, null, 2) : "Shown when you run from URL."}
              </pre>
            </div>
          </section>
        ) : null}
      </div>
      <style jsx>{`
      .audit-title-gradient {
        background-size: 220% 220%;
        animation: auditGradientShift 7s ease-in-out infinite;
        filter: drop-shadow(0 8px 22px rgba(249, 115, 22, 0.18));
      }
    
      @keyframes auditGradientShift {
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
    </main>
  );
}
