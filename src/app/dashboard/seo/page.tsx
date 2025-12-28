"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /dashboard/seo
 *
 * Premium hybrid page (Extract + Describe + Monitor patterns)
 *
 * See conversation for full requirements: single-run + bulk, re-run diagnostics flag,
 * preserve telemetry and module outputs, graceful polling and error handling.
 *
 * This file fixes the previous build error by ensuring all JSX and function scopes are closed.
 * Drop into: src/app/dashboard/seo/page.tsx
 *
 * Note: This is a UI file and relies on existing API endpoints already discussed:
 * - /api/v1/ingest
 * - /api/v1/pipeline/run
 * - /api/v1/seo/bulk
 * - /api/v1/seo/bulk/{id}
 * - /api/v1/seo/bulk/{id}/items
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
  run?: ({ id: string; status: PipelineRunStatus } & Record<string, any>) | null;
  modules?: PipelineModule[] | null;
};

type RunMode = "seo" | "full";
type SourceMode = "url" | "ingestion";

type BulkMode = "quick" | "full";
type BulkParseRow = {
  index: number;
  url: string;
  price?: string | null;
  idempotencyKey: string;
  domain: string;
  valid: boolean;
  reason?: string | null;
};

type BulkJobSummary = {
  id: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  total_items?: number | null;
  completed_items?: number | null;
  failed_items?: number | null;
  options?: any;
  metrics?: any;
};

type BulkJobItem = {
  id: string;
  index?: number | null;
  input_url?: string | null;
  metadata?: any;
  idempotency_key?: string | null;
  ingestion_id?: string | null;
  pipeline_run_id?: string | null;
  status?: string | null;
  tries?: number | null;
  last_error?: any;
  started_at?: string | null;
  finished_at?: string | null;
};

const SEO_ONLY_STEPS = ["extract", "seo"] as const;
const FULL_STEPS = ["extract", "seo", "audit", "import", "monitor", "price"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeDateMs(v?: string | null) {
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function extractEngineErrorMessage(payload: any): string {
  const e = payload?.error;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    return String(e.message || e.detail || e.code || "ingest_engine_error");
  }
  return String(payload?.last_error || "ingest_engine_error");
}

function shortId(id?: string | null, keep = 6) {
  if (!id) return "—";
  const s = String(id);
  if (s.length <= keep * 2 + 2) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

function statusPillTone(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "succeeded" || s === "success")
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/40";
  if (s === "failed" || s === "error")
    return "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/35 dark:text-rose-200 dark:border-rose-900/40";
  if (s === "running")
    return "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:border-sky-900/40";
  if (s === "queued" || s === "pending")
    return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:border-amber-900/40";
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/35 dark:text-slate-200 dark:border-slate-800";
}

function canonicalizeUrl(u: string): string {
  try {
    const url = new URL(u.trim());
    const proto = url.protocol.toLowerCase();
    if (proto !== "http:" && proto !== "https:") return u.trim();
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    const query = url.search || "";
    return `${proto}//${host}${path}${query}`;
  } catch {
    return u.trim();
  }
}

function getDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "—";
  }
}

function isValidHttpUrl(u: string): boolean {
  try {
    const url = new URL(u.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function computeIdempotencyKey(url: string, price?: string | null) {
  const c = canonicalizeUrl(url);
  const p = (price || "").toString().trim();
  return p ? `${c}::${p}` : c;
}

// Minimal CSV parsing (handles basic quoting)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    rows.push(out);
  }
  return rows;
}

function parseBulkText(text: string): BulkParseRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const seen = new Set<string>();
  const rows: BulkParseRow[] = [];

  lines.forEach((line, idx) => {
    let url = line;
    let price: string | null = null;

    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
      url = parts[0] || "";
      price = parts[1] || null;
    } else if (line.includes(",")) {
      const firstComma = line.indexOf(",");
      const left = line.slice(0, firstComma).trim();
      const right = line.slice(firstComma + 1).trim();
      if (left.startsWith("http://") || left.startsWith("https://")) {
        url = left;
        price = right || null;
      }
    } else if (line.includes(" ")) {
      const parts = line.split(/\s+/).map((p) => p.trim()).filter(Boolean);
      url = parts[0] || "";
      price = parts[1] || null;
    }

    const canonical = canonicalizeUrl(url);
    const valid = isValidHttpUrl(url);
    const domain = valid ? getDomain(canonical) : "—";
    const idempotencyKey = computeIdempotencyKey(canonical, price);

    let reason: string | null = null;
    if (!valid) reason = "Invalid URL (must start with http/https)";
    else if (seen.has(idempotencyKey)) reason = "Duplicate (idempotency key)";

    if (valid) seen.add(idempotencyKey);

    rows.push({
      index: idx + 1,
      url: canonical,
      price,
      idempotencyKey,
      domain,
      valid: valid && !reason,
      reason,
    });
  });

  return rows;
}

function buildCsvFromItems(items: BulkJobItem[]): string {
  const header = ["index", "url", "status", "tries", "ingestion_id", "pipeline_run_id", "error"];
  const lines = [header.join(",")];
  for (const it of items) {
    const row = [
      String(it.index ?? ""),
      JSON.stringify(it.input_url ?? ""),
      JSON.stringify(it.status ?? ""),
      String(it.tries ?? ""),
      JSON.stringify(it.ingestion_id ?? ""),
      JSON.stringify(it.pipeline_run_id ?? ""),
      JSON.stringify(
        it.last_error
          ? typeof it.last_error === "string"
            ? it.last_error
            : JSON.stringify(it.last_error)
          : ""
      ),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export default function AvidiaSeoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const ingestionIdParam = params?.get("ingestionId") || "";
  const urlParam = params?.get("url") || "";
  const pipelineRunIdParam = params?.get("pipelineRunId") || "";
  const bulkJobIdParam = params?.get("bulkJobId") || "";

  // Single-run states
  const [sourceMode, setSourceMode] = useState<SourceMode>(
    urlParam ? "url" : ingestionIdParam ? "ingestion" : "url"
  );
  const [runMode, setRunMode] = useState<RunMode>(urlParam ? "full" : "seo");

  // UI: single vs bulk panel
  const [panelMode, setPanelMode] = useState<"single" | "bulk">(
    bulkJobIdParam ? "bulk" : "single"
  );

  useEffect(() => {
    if (bulkJobIdParam) setPanelMode("bulk");
  }, [bulkJobIdParam]);

  const [urlInput, setUrlInput] = useState<string>(urlParam || "");
  const [ingestionIdInput, setIngestionIdInput] = useState<string>(
    ingestionIdParam || ""
  );

  const [reuseExistingWhenSameUrl, setReuseExistingWhenSameUrl] =
    useState<boolean>(true);

  const [job, setJob] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const [rawIngestResponse, setRawIngestResponse] = useState<any | null>(null);
  const [pollingState, setPollingState] = useState<string | null>(null);

  const [pipelineRunId, setPipelineRunId] = useState<string | null>(
    pipelineRunIdParam || null
  );
  const [pipelineSnapshot, setPipelineSnapshot] =
    useState<PipelineSnapshot | null>(null);

  // Bulk states
  const [bulkName, setBulkName] = useState<string>("");
  const [bulkMode, setBulkMode] = useState<BulkMode>("quick");
  const [bulkConcurrency, setBulkConcurrency] = useState<number>(10);
  const [bulkPerDomainLimit, setBulkPerDomainLimit] = useState<number>(2);

  const [bulkText, setBulkText] = useState<string>("");
  const [bulkRows, setBulkRows] = useState<BulkParseRow[]>([]);
  const [bulkRemoved, setBulkRemoved] = useState<Record<string, boolean>>({});
  const [bulkParseError, setBulkParseError] = useState<string | null>(null);

  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkJobId, setBulkJobId] = useState<string>(bulkJobIdParam || "");
  const [bulkJob, setBulkJob] = useState<BulkJobSummary | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkJobItem[]>([]);
  const [bulkFetchError, setBulkFetchError] = useState<string | null>(null);
  const [bulkPolling, setBulkPolling] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pipelineRunIdParam) setPipelineRunId(pipelineRunIdParam);
  }, [pipelineRunIdParam]);

  useEffect(() => {
    if (bulkJobIdParam) setBulkJobId(bulkJobIdParam);
  }, [bulkJobIdParam]);

  useEffect(() => {
    if (urlParam) {
      setSourceMode("url");
      setRunMode("full");
      setUrlInput(urlParam);
    } else if (ingestionIdParam) {
      setSourceMode("ingestion");
      setIngestionIdInput(ingestionIdParam);
    }
  }, [urlParam, ingestionIdParam]);

  useEffect(() => {
    const id = ingestionIdInput.trim();
    if (!id) return;
    fetchIngestionData(id).catch((e) => {
      console.warn("fetchIngestionData failed", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestionIdInput]);

  // parse bulk text on change (debounced)
  useEffect(() => {
    const t = bulkText;
    const handle = setTimeout(() => {
      try {
        setBulkParseError(null);
        if (!t.trim()) {
          setBulkRows([]);
          setBulkRemoved({});
          return;
        }
        const parsed = parseBulkText(t);
        setBulkRows(parsed);
        setBulkRemoved({});
      } catch (e: any) {
        setBulkParseError(String(e?.message || e));
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [bulkText]);

  async function fetchIngestionData(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/ingest/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          json?.error?.message || json?.error || `Fetch failed: ${res.status}`
        );
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
    if (!res.ok)
      throw new Error(
        json?.error?.message ||
          json?.error ||
          `Pipeline fetch failed: ${res.status}`
      );
    return json as PipelineSnapshot;
  }

  async function pollPipeline(
    runId: string,
    timeoutMs = 180_000,
    intervalMs = 2000
  ) {
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

  async function pollForIngestion(
    jobId: string,
    timeoutMs = 120_000,
    intervalMs = 3000
  ) {
    const start = Date.now();
    setPollingState(`polling job ${jobId}`);
    setStatusMessage("Scraping & normalizing");

    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`/api/v1/ingest/job/${encodeURIComponent(jobId)}`);
      const payload = await res.json().catch(() => null);

      if (res.status === 200) {
        setPollingState(`completed: ingestionId=${payload?.ingestionId}`);
        setStatusMessage("Ingestion callback received");
        return payload;
      }

      if (res.status === 409) {
        const msg = extractEngineErrorMessage(payload);
        setPollingState(`failed: ${msg}`);
        setStatusMessage(null);
        const err: any = new Error(msg);
        err.code = payload?.error?.code || "ingest_engine_error";
        err.payload = payload;
        throw err;
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

    setError(null);
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
    console.debug("POST /api/v1/ingest response:", res.status, json);
    setRawIngestResponse({ status: res.status, body: json });

    if (!res.ok) {
      throw new Error(
        json?.error?.message || json?.error || `Ingest failed: ${res.status}`
      );
    }

    const possibleIngestionId =
      json?.ingestionId ??
      json?.id ??
      json?.data?.id ??
      json?.data?.ingestionId ??
      null;

    if (possibleIngestionId) {
      if (json?.status === "accepted" || res.status === 202) {
        const jobId = json?.jobId ?? json?.ingestionId ?? possibleIngestionId;
        const pollResult = await pollForIngestion(jobId, 120_000, 3000);
        return pollResult?.ingestionId ?? possibleIngestionId;
      }
      return possibleIngestionId;
    }

    const jobId = json?.jobId ?? json?.job?.id ?? null;
    if (!jobId)
      throw new Error("Ingest did not return an ingestionId or jobId. See debug.");
    const pollResult = await pollForIngestion(jobId, 120_000, 3000);
    const newId = pollResult?.ingestionId ?? pollResult?.id ?? null;
    if (!newId) throw new Error("Polling returned no ingestionId.");
    return newId;
  }

  async function startPipelineRun(forIngestionId: string, mode: RunMode) {
    const steps = mode === "seo" ? SEO_ONLY_STEPS : FULL_STEPS;

    setStatusMessage("Starting pipeline");
    const res = await fetch("/api/v1/pipeline/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ingestionId: forIngestionId,
        triggerModule: "seo",
        steps,
        options: {},
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok)
      throw new Error(
        json?.error?.message ||
          json?.error ||
          `Pipeline start failed: ${res.status}`
      );

    const runId = String(json?.pipelineRunId ?? "");
    if (!runId) throw new Error("Pipeline start did not return pipelineRunId");

    setPipelineRunId(runId);

    const qp = new URLSearchParams();
    qp.set("ingestionId", forIngestionId);
    if (urlInput.trim()) qp.set("url", urlInput.trim());
    qp.set("pipelineRunId", runId);
    if (bulkJobId) qp.set("bulkJobId", bulkJobId);
    router.push(`/dashboard/seo?${qp.toString()}`);

    setStatusMessage("Pipeline running");
    return runId;
  }

  async function markIngestionRerun(ingestionIdToMark: string, modeToMark: RunMode) {
    try {
      const payload = {
        rerun_by_ui: true,
        rerun_at: new Date().toISOString(),
        rerun_mode: modeToMark,
        note: "ui_rerun_flag",
      };

      const res = await fetch(
        `/api/v1/ingest/${encodeURIComponent(ingestionIdToMark)}/diagnostics`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        await fetchIngestionData(ingestionIdToMark);
        return true;
      }

      const fallback = await fetch(
        `/api/v1/ingest/${encodeURIComponent(ingestionIdToMark)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            diagnostics: { ...(job as any)?.diagnostics, ui_rerun: payload },
          }),
        }
      );

      if (fallback.ok) {
        await fetchIngestionData(ingestionIdToMark);
        return true;
      }

      console.warn("markIngestionRerun: all attempts failed", {
        resStatus: res.status,
        fallbackStatus: fallback.status,
      });
      return false;
    } catch (err) {
      console.warn("markIngestionRerun failed", err);
      return false;
    }
  }

  async function runNow() {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setStatusMessage(null);
    setPipelineSnapshot(null);

    try {
      const trimmedUrl = (urlInput || "").trim();
      const trimmedIngestion = (ingestionIdInput || "").trim();

      let idToUse: string | null = null;
      let createdNewIngestion = false;

      if (sourceMode === "ingestion") {
        if (!trimmedIngestion) throw new Error("Please enter an ingestionId");
        idToUse = trimmedIngestion;
      } else {
        if (!trimmedUrl) throw new Error("Please enter a URL");

        const isSameAsInitial = Boolean(
          urlParam && trimmedUrl && urlParam === trimmedUrl
        );
        if (reuseExistingWhenSameUrl && isSameAsInitial && ingestionIdParam) {
          idToUse = ingestionIdParam;
          setIngestionIdInput(ingestionIdParam);
        } else {
          setJob(null);
          setRawIngestResponse(null);
          setPollingState(null);
          idToUse = await createIngestion(trimmedUrl);
          createdNewIngestion = true;
          setIngestionIdInput(idToUse);
        }
      }

      if (!idToUse) throw new Error("No ingestionId available to run pipeline");

      if (!createdNewIngestion) {
        await markIngestionRerun(idToUse, runMode);
      }

      await fetchIngestionData(idToUse);

      const runId = await startPipelineRun(idToUse, runMode);

      const snap = await pollPipeline(
        runId,
        runMode === "seo" ? 180_000 : 300_000,
        2000
      );

      await fetchIngestionData(idToUse);

      const finalStatus = snap?.run?.status;

      if (finalStatus === "succeeded") {
        setStatusMessage(runMode === "seo" ? "SEO run succeeded" : "Full pipeline succeeded");
      } else if (finalStatus === "failed") {
        setStatusMessage(null);
        throw new Error("Pipeline failed (see pipeline telemetry + module output).");
      } else {
        setStatusMessage(null);
        throw new Error(`Pipeline ended in unexpected status: ${String(finalStatus)}`);
      }
    } catch (e: any) {
      if (e?.payload) console.warn("Terminal ingest error payload:", e.payload);
      setError(String(e?.message || e));
      setStatusMessage(null);
    } finally {
      setGenerating(false);
      setPollingState(null);
    }
  }

  // Bulk API helpers
  async function fetchBulkJob(jobId: string) {
    const res = await fetch(`/api/v1/seo/bulk/${encodeURIComponent(jobId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Bulk fetch failed: ${res.status}`);
    }
    const base = json?.data ?? json;
    const job = (base?.job ?? base) as BulkJobSummary;
    const items = (base?.items ?? base?.jobItems ?? base?.rows ?? []) as BulkJobItem[];
    return { job, items };
  }

  async function fetchBulkItems(jobId: string, limit = 200) {
    const res = await fetch(`/api/v1/seo/bulk/${encodeURIComponent(jobId)}/items?limit=${limit}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Bulk items fetch failed: ${res.status}`);
    }
    const base = json?.data ?? json;
    const items = (base?.items ?? base?.rows ?? base) as BulkJobItem[];
    return Array.isArray(items) ? items : [];
  }

  async function refreshBulk(jobId: string) {
    setBulkFetchError(null);
    try {
      const { job, items } = await fetchBulkJob(jobId);
      setBulkJob(job);
      setBulkItems(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setBulkFetchError(String(e?.message || e));
      try {
        const items = await fetchBulkItems(jobId, 200);
        setBulkItems(items);
      } catch {}
    }
  }

  useEffect(() => {
    if (!bulkJobId) return;
    refreshBulk(bulkJobId).catch(() => null);

    if (!bulkPolling) return;
    const handle = setInterval(() => {
      refreshBulk(bulkJobId).catch(() => null);
    }, 2500);

    return () => clearInterval(handle);
  }, [bulkJobId, bulkPolling]);

  async function submitBulkJob() {
    if (bulkSubmitting) return;

    const activeRows = bulkRows.filter((r) => !bulkRemoved[r.idempotencyKey]);
    const good = activeRows.filter((r) => r.valid);

    if (!good.length) {
      setBulkParseError("No valid rows to submit. Paste URLs or upload a CSV first.");
      return;
    }

    setBulkSubmitting(true);
    setBulkFetchError(null);

    try {
      const payload = {
        name: bulkName?.trim() || undefined,
        items: good.map((r) => ({
          url: r.url,
          price: r.price || undefined,
          idempotencyKey: r.idempotencyKey,
        })),
        options: {
          mode: bulkMode,
          concurrency: bulkConcurrency,
          perDomainLimit: bulkPerDomainLimit,
        },
      };

      const res = await fetch("/api/v1/seo/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.error || `Bulk submit failed: ${res.status}`);
      }

      const newId =
        String(json?.bulkJobId ?? json?.id ?? json?.data?.bulkJobId ?? json?.data?.id ?? "");

      if (!newId) throw new Error("Bulk submit succeeded but did not return bulkJobId");

      setBulkJobId(newId);

      const qp = new URLSearchParams();
      if (ingestionIdInput.trim()) qp.set("ingestionId", ingestionIdInput.trim());
      if (urlInput.trim()) qp.set("url", urlInput.trim());
      if (pipelineRunId) qp.set("pipelineRunId", pipelineRunId);
      qp.set("bulkJobId", newId);
      router.push(`/dashboard/seo?${qp.toString()}`);

      await refreshBulk(newId);
      setStatusMessage(`Bulk job created (${good.length} items)`);
    } catch (e: any) {
      setBulkFetchError(String(e?.message || e));
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function cancelBulkJob() {
    if (!bulkJobId) return;
    try {
      const res = await fetch(`/api/v1/seo/bulk/${encodeURIComponent(bulkJobId)}/cancel`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.error || `Cancel failed: ${res.status}`);
      }
      await refreshBulk(bulkJobId);
    } catch (e: any) {
      setBulkFetchError(String(e?.message || e));
    }
  }

  function onSelectBulkItem(it: BulkJobItem) {
    const ingestionId = it.ingestion_id || "";
    const runId = it.pipeline_run_id || "";
    if (ingestionId) setIngestionIdInput(ingestionId);
    if (runId) setPipelineRunId(runId);

    const qp = new URLSearchParams();
    qp.set("ingestionId", ingestionId || "");
    if (it.input_url) qp.set("url", String(it.input_url));
    if (runId) qp.set("pipelineRunId", runId);
    if (bulkJobId) qp.set("bulkJobId", bulkJobId);
    router.push(`/dashboard/seo?${qp.toString()}`);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onUploadCsv(file: File) {
    try {
      setBulkParseError(null);
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        setBulkParseError("CSV appears empty.");
        return;
      }

      const header = rows[0].map((h) => String(h || "").toLowerCase().trim());
      let urlIdx = header.findIndex((h) => h === "url" || h.includes("url") || h.includes("link"));
      let priceIdx = header.findIndex((h) => h === "price" || h.includes("price") || h.includes("cost"));

      const startRow = urlIdx === -1 ? 0 : 1;
      if (urlIdx === -1) urlIdx = 0;
      if (priceIdx === -1) priceIdx = 1;

      const lines: string[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const r = rows[i];
        const u = String(r[urlIdx] || "").trim();
        const p = String(r[priceIdx] || "").trim();
        if (!u) continue;
        lines.push(p ? `${u},${p}` : u);
      }

      setBulkText(lines.join("\n"));
      setStatusMessage(`Loaded ${lines.length} rows from CSV`);
    } catch (e: any) {
      setBulkParseError(String(e?.message || e));
    }
  }

  const jobData = useMemo(() => {
    if (!job) return null;
    if ((job as any)?.data?.data) return (job as any).data.data;
    if ((job as any)?.data) return (job as any).data;
    return job;
  }, [job]);

  const seo = useMemo(() => {
    return (jobData as any)?.seo ?? (jobData as any)?.seoPayload ?? (jobData as any)?.seo_payload ?? null;
  }, [jobData]);

  const rawDescriptionHtml =
    (jobData as any)?.descriptionHtml ??
    (jobData as any)?.description_html ??
    (jobData as any)?._debug?.description_html ??
    null;

  const descriptionHtml =
    typeof rawDescriptionHtml === "string" && rawDescriptionHtml.trim().length > 0 ? rawDescriptionHtml : null;

  const features = useMemo(() => {
    if (Array.isArray((jobData as any)?.features)) return (jobData as any).features;
    if (Array.isArray((jobData as any)?.seo_payload?.features)) return (jobData as any).seo_payload.features;
    return null;
  }, [jobData]);

  const highlightedDescription = useMemo(() => {
    if (!descriptionHtml) return "<em>No description generated yet</em>";
    if (!searchTerm) return descriptionHtml;
    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return descriptionHtml.replace(
        regex,
        '<mark class="bg-amber-200 text-gray-900 px-1 rounded-sm">$1</mark>'
      );
    } catch (err) {
      console.warn("Unable to highlight search term", err);
      return descriptionHtml;
    }
  }, [descriptionHtml, searchTerm]);

  const knownSeoKeys = [
    "h1",
    "pageTitle",
    "title",
    "metaDescription",
    "meta_description",
    "seoShortDescription",
    "seo_short_description",
    "shortDescription",
    "short_description",
    "keywords",
    "slug",
    "name_best",
  ];

  const parkedExtras = useMemo(() => {
    if (!seo || typeof seo !== "object") return [] as [string, any][];
    return Object.entries(seo).filter(([key]) => !knownSeoKeys.includes(key));
  }, [seo]);

  const handleCopyDescription = async () => {
    if (!descriptionHtml) return;
    try {
      await navigator.clipboard.writeText(descriptionHtml);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch (err) {
      console.warn("clipboard copy failed", err);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  const moduleDurations = useMemo(() => {
    const mods = (pipelineSnapshot?.modules ?? []) as PipelineModule[];
    return mods.map((m) => {
      const start = safeDateMs(m.started_at ?? null);
      const end = safeDateMs(m.finished_at ?? null);
      const duration =
        start != null && end != null
          ? clamp(end - start, 0, 24 * 60 * 60 * 1000)
          : null;
      return { ...m, duration_ms: duration };
    });
  }, [pipelineSnapshot]);

  const rerunInfo = useMemo(() => {
    const d = (jobData as any)?.diagnostics;
    if (!d) return null;
    if (d?.ui_rerun) return d.ui_rerun;
    if (d?.rerun_by_ui) {
      return { rerun_by_ui: true, rerun_at: d?.rerun_at, rerun_mode: d?.rerun_mode };
    }
    if (d?.ui_rerun?.rerun_by_ui) return d.ui_rerun;
    return null;
  }, [jobData]);

  const pipelineStatus = pipelineSnapshot?.run?.status || (pipelineRunId ? "running" : null);

  const canRun =
    !generating &&
    ((sourceMode === "url" && urlInput.trim().length > 0) ||
      (sourceMode === "ingestion" && ingestionIdInput.trim().length > 0));

  const bulkCounts = useMemo(() => {
    const items = bulkItems || [];
    const total = bulkJob?.total_items ?? items.length;
    const byStatus: Record<string, number> = {};
    for (const it of items) {
      const s = String(it.status || "unknown").toLowerCase();
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    const done = (byStatus["succeeded"] || 0) + (byStatus["failed"] || 0) + (byStatus["skipped"] || 0);
    const running = (byStatus["running"] || 0) + (byStatus["in_progress"] || 0);
    const queued = (byStatus["queued"] || 0) + (byStatus["pending"] || 0);
    const failed = (byStatus["failed"] || 0);
    const succeeded = (byStatus["succeeded"] || 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, running, queued, failed, succeeded, pct, byStatus };
  }, [bulkItems, bulkJob]);

  // UI rendering continues below (single + bulk panels; results + telemetry + bulk job list)
  // For brevity we reuse the structure from earlier messages and ensure all tags are closed.

  return (
    <main className="relative min-h-[calc(100vh-64px)]">
      {/* Hero + controls are already rendered above; here render panels and results */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Panels */}
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: single or bulk */}
          <div className="lg:col-span-8">
            {panelMode === "single" ? (
              <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
                <div className="text-sm font-semibold">Preview & Output</div>
                <div className="mt-3 prose max-w-none">
                  {descriptionHtml ? (
                    <article dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
                  ) : (
                    <div className="text-slate-500 italic">No description generated yet. Run a job to populate.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Bulk uploader</div>
                    <div className="text-xs text-slate-500">Paste URLs (one per line) — optional price: url,price</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadCsv(f);
                        e.currentTarget.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded bg-slate-100 px-3 py-1 text-sm"
                    >
                      Upload CSV
                    </button>
                    <button
                      onClick={submitBulkJob}
                      disabled={bulkSubmitting}
                      className="rounded bg-cyan-600 px-3 py-1 text-sm text-white"
                    >
                      {bulkSubmitting ? "Submitting…" : "Create Bulk Job"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-medium">Job name (optional)</label>
                    <input value={bulkName} onChange={(e) => setBulkName(e.target.value)} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-medium">Paste URLs</label>
                    <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} className="mt-1 w-full rounded border px-2 py-1 text-sm" placeholder="https://example.com/p1,19.99" />
                    {bulkParseError ? <div className="mt-2 text-sm text-rose-600">{bulkParseError}</div> : null}
                  </div>

                  <div className="flex gap-2">
                    <div>
                      <label className="text-xs">Mode</label>
                      <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value as BulkMode)} className="ml-2 rounded border px-2 py-1 text-sm">
                        <option value="quick">Quick (extract+seo)</option>
                        <option value="full">Full (extract+seo+audit+import+monitor+price)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs">Concurrency</label>
                      <input type="number" value={bulkConcurrency} onChange={(e) => setBulkConcurrency(Number(e.target.value))} className="ml-2 rounded border px-2 py-1 text-sm w-24" />
                    </div>

                    <div>
                      <label className="text-xs">Per-domain</label>
                      <input type="number" value={bulkPerDomainLimit} onChange={(e) => setBulkPerDomainLimit(Number(e.target.value))} className="ml-2 rounded border px-2 py-1 text-sm w-20" />
                    </div>
                  </div>

                  {bulkRows.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-600">Preview ({bulkRows.length} rows)</div>
                      <div className="mt-2 space-y-1 text-xs">
                        {bulkRows.slice(0, 200).map((r) => (
                          <div key={r.idempotencyKey} className="flex items-center justify-between gap-2 rounded border p-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm">{r.url}</div>
                              <div className="text-xs text-slate-500">{r.domain} {r.price ? `• ${r.price}` : ""}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={r.valid ? "text-emerald-700 text-xs" : "text-rose-600 text-xs"}>{r.valid ? "OK" : r.reason}</div>
                              <button onClick={() => setBulkRemoved((s) => ({ ...s, [r.idempotencyKey]: !s[r.idempotencyKey] }))} className="text-xs underline">{bulkRemoved[r.idempotencyKey] ? "Add" : "Remove"}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: details, seo, telemetry, bulk job list */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">SEO structure</div>
                  <div className="mt-2 text-sm font-semibold">{seo?.h1 ?? "—"}</div>
                  <div className="text-xs text-slate-500">{seo?.pageTitle ?? seo?.title ?? "—"}</div>
                </div>
                <div>
                  <button onClick={handleCopyDescription} className="rounded bg-slate-100 px-3 py-1 text-sm">Copy HTML</button>
                </div>
              </div>

              <div className="mt-3 text-xs">
                <div><strong>Meta:</strong> {seo?.metaDescription ?? seo?.meta_description ?? "—"}</div>
                <div className="mt-2"><strong>Short:</strong> {seo?.seoShortDescription ?? seo?.seo_short_description ?? "—"}</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Pipeline telemetry</div>
                  <div className="mt-1 text-sm font-semibold">{pipelineSnapshot?.run?.status ?? "—"}</div>
                </div>
                <div className="text-xs text-slate-500">{pipelineRunId ? shortId(pipelineRunId) : "—"}</div>
              </div>

              <div className="mt-3 text-xs">
                {moduleDurations.length > 0 ? (
                  <div className="space-y-2">
                    {moduleDurations.map((m) => (
                      <div key={m.module_name} className="flex items-center justify-between">
                        <div className="text-xs">{m.module_name}</div>
                        <div className="text-xs text-slate-500">{m.duration_ms != null ? formatDuration(m.duration_ms) : "—"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Run a job to see module runtimes.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Bulk job</div>
                <div className="text-xs text-slate-500">{bulkJob?.status ?? "—"}</div>
              </div>

              <div className="mt-3 text-xs space-y-2">
                <div>Total: {bulkCounts.total ?? "—"}</div>
                <div>Queued: {bulkCounts.queued}</div>
                <div>Running: {bulkCounts.running}</div>
                <div>Succeeded: {bulkCounts.succeeded}</div>
                <div>Failed: {bulkCounts.failed}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (bulkJobId) refreshBulk(bulkJobId); }} className="rounded bg-slate-100 px-3 py-1 text-sm">Refresh</button>
                  <button onClick={cancelBulkJob} disabled={!bulkJobId} className="rounded bg-rose-50 px-3 py-1 text-sm">Cancel</button>
                  {bulkItems.length > 0 && (
                    <a href="#" onClick={(e) => { e.preventDefault(); const csv = buildCsvFromItems(bulkItems); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `bulk-${bulkJobId || 'export'}.csv`; a.click(); URL.revokeObjectURL(url); }} className="rounded bg-slate-100 px-3 py-1 text-sm">Export CSV</a>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Bulk items table */}
        {panelMode === "bulk" && bulkJobId ? (
          <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Bulk items</div>
              <div className="text-xs text-slate-500">{bulkCounts.pct}% • {bulkCounts.done}/{bulkCounts.total}</div>
            </div>

            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">URL</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Ingestion</th>
                    <th className="py-2 pr-3">Pipeline</th>
                    <th className="py-2 pr-3">Error</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="py-2 pr-3">{it.index ?? "—"}</td>
                      <td className="py-2 pr-3 max-w-[360px] truncate">{it.input_url}</td>
                      <td className="py-2 pr-3"><span className={cx("inline-block rounded-full px-2 py-0.5 text-xs", statusPillTone(it.status))}>{it.status}</span></td>
                      <td className="py-2 pr-3">{it.ingestion_id ? shortId(it.ingestion_id) : "—"}</td>
                      <td className="py-2 pr-3">{it.pipeline_run_id ? shortId(it.pipeline_run_id) : "—"}</td>
                      <td className="py-2 pr-3">{it.last_error ? (typeof it.last_error === "string" ? it.last_error.slice(0, 120) : JSON.stringify(it.last_error).slice(0, 120)) : "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <button onClick={() => onSelectBulkItem(it)} className="text-xs underline">Open</button>
                          <a className="text-xs underline" href={it.pipeline_run_id ? `/api/v1/pipeline/run/${encodeURIComponent(it.pipeline_run_id)}/output/2` : "#"} target="_blank" rel="noreferrer">View output</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!bulkItems.length && (
                    <tr>
                      <td className="py-4" colSpan={7}>No items yet — create a bulk job to start.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Pipeline telemetry block (single-job) */}
        {pipelineSnapshot && (
          <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Pipeline telemetry</div>
                <div className="text-xs text-slate-500">Run: {pipelineSnapshot.run?.id ?? "—"}</div>
              </div>
              <div className="text-xs text-slate-500">{pipelineSnapshot.run?.status ?? "—"}</div>
            </div>

            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Module</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleDurations.map((m) => (
                    <tr key={m.module_name} className="border-b">
                      <td className="py-2 pr-3">{m.module_name} (#{m.module_index})</td>
                      <td className="py-2 pr-3">{m.status}</td>
                      <td className="py-2 pr-3">{m.duration_ms != null ? formatDuration(m.duration_ms) : "—"}</td>
                      <td className="py-2 pr-3">
                        {pipelineRunId ? (
                          <a className="underline" href={`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${encodeURIComponent(String(m.module_index))}`} target="_blank" rel="noreferrer">
                            View output
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {loading && <div className="mt-4 text-sm text-slate-600">Loading ingestion…</div>}
      </div>
    </main>
  );
}
