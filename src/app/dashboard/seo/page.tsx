"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /dashboard/seo
 *
 * Premium hybrid page (Extract + Describe + Monitor patterns)
 *
 * Single-run behaviors:
 * - Run SEO from a URL or replay a stored ingestionId
 * - Two run modes:
 *   - "SEO only": extract → seo
 *   - "Full pipeline": extract → seo → audit → import → monitor → price
 *
 * Bulk behaviors (additive; does not disrupt single-run):
 * - Paste many URLs (optionally with price)
 * - Upload a CSV (url required, price optional)
 * - Submit a BulkJob (POST /api/v1/seo/bulk)
 * - View live job status + item list (GET /api/v1/seo/bulk/{id} and /items)
 * - Click an item to open it in single-run view
 *
 * Operator guardrails:
 * - Never report “completed” if pipeline status is “failed”.
 * - Ingestion polling treats terminal errors as terminal (server returns 409).
 * - When running a pipeline against an existing ingestion id (no new ingestion created),
 *   we persist a small diagnostics “rerun” flag (best-effort) so operators can see it was a re-run.
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
  /** Stable key for UI selection/removal (unique per row). */
  key: string;
  index: number;
  url: string;
  price?: string | null;
  /** Dedupe/idempotency key (same URLs+metadata should share this). */
  idempotencyKey: string;
  domain: string;
  valid: boolean;
  reason?: string | null;
  /** Non-fatal warnings (e.g., duplicate rows) */
  warning?: string | null;
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
    // normalize host casing, strip hash; keep query (some sites depend on it)
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, ""); // remove trailing slashes
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

// Minimal CSV parsing (handles quotes enough for URL/price columns)
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

  // Track first occurrence of an idempotency key to flag duplicates (non-fatal)
  const seenFirstIndex = new Map<string, number>();
  const rows: BulkParseRow[] = [];

  lines.forEach((line, idx) => {
    let url = line;
    let price: string | null = null;

    // Prefer tab split, then comma split (first comma), then whitespace split
    if (line.includes("\t")) {
      const parts = line
        .split("\t")
        .map((p) => p.trim())
        .filter(Boolean);
      url = parts[0] || "";
      price = parts[1] || null;
    } else if (line.includes(",")) {
      const firstComma = line.indexOf(",");
      const left = line.slice(0, firstComma).trim();
      const right = line.slice(firstComma + 1).trim();
      // only treat as url,price when left looks like a URL
      if (left.startsWith("http://") || left.startsWith("https://")) {
        url = left;
        price = right || null;
      }
    } else if (line.includes(" ")) {
      const parts = line
        .split(/\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      url = parts[0] || "";
      price = parts[1] || null;
    }

    const canonical = canonicalizeUrl(url);
    const isHttp = isValidHttpUrl(url);
    const domain = isHttp ? getDomain(canonical) : "—";

    const idempotencyKey = computeIdempotencyKey(canonical, price);
    const key = `${idempotencyKey}::${idx}`;

    let valid = true;
    let warning: string | null = null;
    let reason: string | null = null;

    if (!isHttp) {
      valid = false;
      reason = "Invalid URL (must start with http/https)";
      warning = reason;
    } else {
      const first = seenFirstIndex.get(idempotencyKey);
      if (first != null) {
        // duplicates are allowed but warned; operator can uncheck removal
        warning = `Duplicate of row ${first + 1}`;
      } else {
        seenFirstIndex.set(idempotencyKey, idx);
      }
    }

    rows.push({
      key,
      index: idx + 1,
      url: canonical,
      price,
      idempotencyKey,
      domain,
      valid,
      reason,
      warning,
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

  // UI: single vs bulk panel (full-width switch, no side-by-side cards)
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

        // Default removals: invalid rows + duplicates (operators can uncheck)
        const removed: Record<string, boolean> = {};
        const firstByIdem = new Set<string>();
        for (const r of parsed) {
          if (!r.valid) {
            removed[r.key] = true;
            continue;
          }
          if (firstByIdem.has(r.idempotencyKey)) {
            removed[r.key] = true;
          } else {
            firstByIdem.add(r.idempotencyKey);
          }
        }
        setBulkRemoved(removed);
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
          const newIngestionId = await createIngestion(trimmedUrl);
          idToUse = newIngestionId;
          createdNewIngestion = true;
          setIngestionIdInput(newIngestionId);
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

  // Bulk API helpers (best-effort; backend may not be deployed yet)
  async function fetchBulkJob(jobId: string) {
    const res = await fetch(`/api/v1/seo/bulk/${encodeURIComponent(jobId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.error || `Bulk fetch failed: ${res.status}`);
    }

    // Flexible shapes:
    // - { job, items }
    // - { data: { job, items } }
    // - { ...jobFields, items: [...] }
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
      // fallback to items endpoint if job endpoint doesn't include items
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobId, bulkPolling]);

  async function submitBulkJob() {
    if (bulkSubmitting) return;

    const activeRows = bulkRows.filter((r) => !bulkRemoved[r.key]);
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

      // persist to URL for shareability
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

    // Make sure the operator sees results immediately
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

      // find header indices (url required)
      const header = rows[0].map((h) => String(h || "").toLowerCase().trim());
      let urlIdx = header.findIndex((h) => h === "url" || h.includes("url") || h.includes("link"));
      let priceIdx = header.findIndex((h) => h === "price" || h.includes("price") || h.includes("cost"));

      // if no header match, assume first col is url, second is price
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

  const onBulkCsvPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    // allow picking the same file twice
    e.target.value = "";
    if (!file) return;
    await onUploadCsv(file);
  };


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

  const bulkRowsPreview = useMemo(() => {
    // Present valid rows first, then invalid (so operators see what will run).
    const rows = [...bulkRows];
    rows.sort((a, b) => {
      if (a.valid === b.valid) return a.index - b.index;
      return a.valid ? -1 : 1;
    });
    return rows;
  }, [bulkRows]);


  const bulkKeptCount = useMemo(() => {
    // "Kept" = valid rows that are NOT marked removed (what will be submitted)
    return bulkRows.filter((r) => r.valid && !bulkRemoved[r.key]).length;
  }, [bulkRows, bulkRemoved]);

  const bulkDedupedCount = useMemo(() => {
    // "Deduped" = rows auto-removed because they were duplicates (operators can uncheck)
    return bulkRows.filter(
      (r) =>
        r.valid &&
        !!bulkRemoved[r.key] &&
        typeof r.warning === "string" &&
        r.warning.toLowerCase().startsWith("duplicate")
    ).length;
  }, [bulkRows, bulkRemoved]);




  
  const bulkCanSubmit = useMemo(() => {
    // Can submit bulk job only when we have at least 1 valid, non-removed row and we're not already submitting.
    if (bulkSubmitting) return false;
    if (bulkParseError) return false;
    return bulkKeptCount > 0;
  }, [bulkSubmitting, bulkParseError, bulkKeptCount]);

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

  return (
    <main className="relative min-h-[calc(100vh-64px)]">
      {/* Premium gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute -top-24 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-900/20" />
        <div className="absolute top-40 right-[-6rem] h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-900/15" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-900/15" />
        <div
          className="absolute inset-0 opacity-[0.45] dark:opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "radial-gradient(circle at 40% 0%, black 0%, transparent 55%)",
            WebkitMaskImage:
              "radial-gradient(circle at 40% 0%, black 0%, transparent 55%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Hero */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/60 dark:text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            AvidiaSEO
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              Extract → SEO → HTML
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
            SEO-ready fields + description HTML, with bulk throughput
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Run a single URL or submit a bulk batch (paste / CSV). Every item keeps the full diagnostic trail: module
            statuses, module outputs, and raw ingestion JSON.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", statusPillTone(pipelineStatus))}>
              <span className="font-medium">Pipeline</span>
              <span className="text-slate-400">•</span>
              <span>{pipelineStatus || "—"}</span>
            </div>

            {ingestionIdInput.trim() ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                <span className="font-medium">Ingestion</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono">{shortId(ingestionIdInput.trim())}</span>
              </div>
            ) : null}

            {pipelineRunId ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                <span className="font-medium">Run</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono">{shortId(pipelineRunId)}</span>
              </div>
            ) : null}

            {bulkJobId ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                <span className="font-medium">Bulk</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono">{shortId(bulkJobId)}</span>
              </div>
            ) : null}

            {rerunInfo ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                <span className="font-medium">Re-run</span>
                <span className="text-amber-500">•</span>
                <span>{rerunInfo?.rerun_mode || "—"}</span>
                {rerunInfo?.rerun_at ? (
                  <span className="text-amber-700/80 dark:text-amber-200/80">
                    {new Date(rerunInfo.rerun_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                <span className="font-medium">Status</span>
                <span className="text-slate-400">•</span>
                <span>{statusMessage}</span>
              </div>
            ) : null}
          </div>

          {/* Run (single/bulk) — full-width switcher under hero */}
          <div className="mt-5">
            <div className="rounded-3xl bg-gradient-to-r from-sky-500/25 via-emerald-500/20 to-amber-500/25 p-[1px] shadow-sm">
              <div className="rounded-3xl bg-white/80 p-4 backdrop-blur dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {panelMode === "single" ? "Run SEO" : "Bulk URLs"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {panelMode === "single"
                        ? "Choose input + run mode. No hidden assumptions."
                        : "Paste many URLs or upload CSV. Creates a bulk job and runs the same pipeline per item."}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {panelMode === "single" && ingestionIdInput.trim() ? (
                      <a
                        className="text-xs text-slate-600 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                        href={`/dashboard/monitor?ingestionId=${encodeURIComponent(
                          ingestionIdInput.trim()
                        )}`}
                      >
                        Open Monitor
                      </a>
                    ) : null}

                    {panelMode === "bulk" ? (
                      <button
                        className="text-xs text-slate-600 underline hover:text-slate-900 disabled:opacity-60 dark:text-slate-300 dark:hover:text-slate-100"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={bulkSubmitting}
                      >
                        Upload CSV
                      </button>
                    ) : null}

                    <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs shadow-inner dark:bg-slate-800/60">
                      <button
                        className={cx(
                          "rounded-xl px-3 py-2",
                          panelMode === "single"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                        )}
                        onClick={() => setPanelMode("single")}
                        disabled={generating || bulkSubmitting}
                      >
                        Single
                      </button>
                      <button
                        className={cx(
                          "rounded-xl px-3 py-2",
                          panelMode === "bulk"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                        )}
                        onClick={() => setPanelMode("bulk")}
                        disabled={generating || bulkSubmitting}
                      >
                        Bulk
                      </button>
                    </div>
                  </div>
                </div>

                {/* SINGLE PANEL */}
                {panelMode === "single" ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                        {/* Source selector */}
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800/60">
                          <button
                            className={cx(
                              "rounded-lg px-3 py-2 text-left",
                              sourceMode === "url"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                            onClick={() => setSourceMode("url")}
                            disabled={generating}
                          >
                            From URL
                          </button>
                          <button
                            className={cx(
                              "rounded-lg px-3 py-2 text-left",
                              sourceMode === "ingestion"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                            onClick={() => setSourceMode("ingestion")}
                            disabled={generating}
                          >
                            From ingestionId
                          </button>
                        </div>

                        {sourceMode === "url" ? (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                              Source URL
                            </label>
                            <input
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                              placeholder="https://example.com/product/..."
                              disabled={generating}
                            />

                            {ingestionIdParam && urlParam ? (
                              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={reuseExistingWhenSameUrl}
                                  onChange={(e) =>
                                    setReuseExistingWhenSameUrl(e.target.checked)
                                  }
                                  disabled={generating}
                                />
                                Re-use existing ingestionId when URL matches this page
                              </label>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                              Ingestion ID
                            </label>
                            <input
                              value={ingestionIdInput}
                              onChange={(e) => setIngestionIdInput(e.target.value)}
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                              placeholder="ing_..."
                              disabled={generating}
                            />
                            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                              Replays a stored ingestion and marks diagnostics as a re-run (best-effort).
                            </div>
                          </div>
                        )}

                        {/* Run mode selector */}
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800/60">
                          <button
                            className={cx(
                              "rounded-lg px-3 py-2 text-left",
                              runMode === "seo"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                            onClick={() => setRunMode("seo")}
                            disabled={generating}
                          >
                            SEO only
                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              extract → seo
                            </div>
                          </button>

                          <button
                            className={cx(
                              "rounded-lg px-3 py-2 text-left",
                              runMode === "full"
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                            onClick={() => setRunMode("full")}
                            disabled={generating}
                          >
                            Full pipeline
                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              extract → … → price
                            </div>
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            className={cx(
                              "inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm",
                              canRun
                                ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                                : "bg-slate-300 dark:bg-slate-700"
                            )}
                            onClick={runNow}
                            disabled={!canRun}
                          >
                            {generating
                              ? "Running…"
                              : runMode === "seo"
                              ? "Run SEO"
                              : "Run Full Pipeline"}
                          </button>

                          {ingestionIdInput.trim() ? (
                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                              onClick={() => fetchIngestionData(ingestionIdInput.trim())}
                              disabled={generating}
                              title="Refresh ingestion row"
                            >
                              Refresh
                            </button>
                          ) : null}
                        </div>

                        {error ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                            {error}
                          </div>
                        ) : null}

                        {rawIngestResponse ? (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                              Ingest debug
                            </summary>
                            <pre className="mt-2 max-h-[220px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                              {JSON.stringify(rawIngestResponse, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Operator hints
                        </div>
                        <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                          <li>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Re-run flag:
                            </span>{" "}
                            when running with an existing ingestionId, a small diagnostics marker is persisted.
                          </li>
                          <li>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Failures:
                            </span>{" "}
                            use <span className="font-mono">View output</span> in telemetry to see module errors.
                          </li>
                          <li>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Share:
                            </span>{" "}
                            the URL contains ingestionId + pipelineRunId for quick support handoffs.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* BULK PANEL */}
                {panelMode === "bulk" ? (
                  <div className="mt-4">
                    {/* hidden input for CSV */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={onBulkCsvPicked}
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                      <div className="lg:col-span-8">
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Paste URLs (one per line). Optional price via{" "}
                            <span className="font-mono">url,price</span> or{" "}
                            <span className="font-mono">url\tprice</span>
                          </label>
                          <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            className="mt-2 h-[140px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                            placeholder={
                              "https://brand.com/p1,19.99\nhttps://brand.com/p2\nhttps://another.com/item\t29.95"
                            }
                            disabled={bulkSubmitting}
                          />

                          {bulkParseError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                              {bulkParseError}
                            </div>
                          ) : null}

                          <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                            <table className="min-w-[760px] w-full text-sm">
                              <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                                <tr className="text-left">
                                  <th className="px-3 py-2">Keep</th>
                                  <th className="px-3 py-2">URL</th>
                                  <th className="px-3 py-2">Price</th>
                                  <th className="px-3 py-2">Domain</th>
                                  <th className="px-3 py-2">Warnings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bulkRowsPreview.map((r) => (
                                  <tr
                                    key={r.key}
                                    className="border-t border-slate-200 dark:border-slate-800"
                                  >
                                    <td className="px-3 py-2">
                                      <input
                                        type="checkbox"
                                        checked={!bulkRemoved[r.key]}
                                        onChange={() =>
                                          setBulkRemoved((prev) => ({
                                            ...prev,
                                            [r.key]: !prev[r.key],
                                          }))
                                        }
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="max-w-[460px] truncate font-mono text-xs text-slate-800 dark:text-slate-200">
                                        {r.url}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                      {r.price ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                      {r.domain || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                                      {r.warning ? (
                                        <span className="text-amber-700 dark:text-amber-300">
                                          {r.warning}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}

                                {!bulkRowsPreview.length ? (
                                  <tr>
                                    <td
                                      className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400"
                                      colSpan={5}
                                    >
                                      Paste URLs or upload a CSV to preview.
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="rounded-full border border-slate-200 bg-white/60 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/40">
                              Parsed: <span className="font-semibold">{bulkRows.length}</span>
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/60 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/40">
                              Kept: <span className="font-semibold">{bulkKeptCount}</span>
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/60 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/40">
                              Deduped: <span className="font-semibold">{bulkDedupedCount}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-4">
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Bulk options
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                Job name (optional)
                              </label>
                              <input
                                value={bulkName}
                                onChange={(e) => setBulkName(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                                placeholder="e.g., Supplier batch 2026-01"
                                disabled={bulkSubmitting}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800/60">
                              <button
                                className={cx(
                                  "rounded-lg px-3 py-2 text-left",
                                  bulkMode === "quick"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                )}
                                onClick={() => setBulkMode("quick")}
                                disabled={bulkSubmitting}
                              >
                                Quick
                                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  extract → seo
                                </div>
                              </button>
                              <button
                                className={cx(
                                  "rounded-lg px-3 py-2 text-left",
                                  bulkMode === "full"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                )}
                                onClick={() => setBulkMode("full")}
                                disabled={bulkSubmitting}
                              >
                                Full
                                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  extract → … → price
                                </div>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  Concurrency
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={bulkConcurrency}
                                  onChange={(e) =>
                                    setBulkConcurrency(Number(e.target.value || 1))
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  disabled={bulkSubmitting}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  Per-domain
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={bulkPerDomainLimit}
                                  onChange={(e) =>
                                    setBulkPerDomainLimit(Number(e.target.value || 1))
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  disabled={bulkSubmitting}
                                />
                              </div>
                            </div>

                            <button
                              className={cx(
                                "mt-1 inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm",
                                bulkCanSubmit
                                  ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                                  : "bg-slate-300 dark:bg-slate-700"
                              )}
                              onClick={submitBulkJob}
                              disabled={!bulkCanSubmit}
                            >
                              {bulkSubmitting ? "Creating job…" : "Create bulk job"}
                            </button>

                            {bulkSubmitError ? (
                              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                                {bulkSubmitError}
                              </div>
                            ) : null}

                            {bulkFetchError ? (
                              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                                {bulkFetchError}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        {/* Bulk job dashboard (appears when bulkJobId exists) */}
        {bulkJobId ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Bulk job dashboard
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                    <span className="font-medium">Job</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono">{shortId(bulkJobId)}</span>
                  </span>
                  <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1", statusPillTone(String(bulkJob?.status || "")))}>
                    <span className="font-medium">Status</span>
                    <span className="text-slate-400">•</span>
                    <span>{bulkJob?.status || "—"}</span>
                  </span>
                  {bulkJob?.name ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="font-medium">Name</span>
                      <span className="text-slate-400">•</span>
                      <span className="truncate max-w-[360px]">{bulkJob.name}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={bulkPolling}
                    onChange={(e) => setBulkPolling(e.target.checked)}
                  />
                  Live refresh
                </label>

                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => refreshBulk(bulkJobId)}
                >
                  Refresh
                </button>

                <button
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 shadow-sm hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200 dark:hover:bg-rose-950/35"
                  onClick={cancelBulkJob}
                >
                  Cancel
                </button>

                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => {
                    const failed = bulkItems.filter((i) => String(i.status || "").toLowerCase() === "failed");
                    const csv = buildCsvFromItems(failed);
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `bulk_failed_${bulkJobId}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={!bulkItems.some((i) => String(i.status || "").toLowerCase() === "failed")}
                >
                  Download failed CSV
                </button>
              </div>
            </div>

            {/* progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {bulkCounts.done}/{bulkCounts.total} complete • {bulkCounts.succeeded} succeeded • {bulkCounts.failed} failed • {bulkCounts.running} running
                </span>
                <span className="font-medium">{bulkCounts.pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500"
                  style={{ width: `${bulkCounts.pct}%` }}
                />
              </div>
            </div>

            {bulkFetchError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                {bulkFetchError}
              </div>
            ) : null}

            {/* items */}
            <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-12">#</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2 w-120">Status</th>
                    <th className="px-3 py-2 w-16">Tries</th>
                    <th className="px-3 py-2 w-28">Ingestion</th>
                    <th className="px-3 py-2 w-28">Run</th>
                    <th className="px-3 py-2 w-40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.slice(0, 200).map((it) => {
                    const status = String(it.status || "—").toLowerCase();
                    return (
                      <tr key={it.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-500">{it.index ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="line-clamp-1 text-slate-900 dark:text-slate-100">
                            {it.input_url || "—"}
                          </div>
                          {status === "failed" && it.last_error ? (
                            <div className="mt-0.5 line-clamp-2 text-[11px] text-rose-700 dark:text-rose-300">
                              {typeof it.last_error === "string" ? it.last_error : JSON.stringify(it.last_error)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusPillTone(status))}>
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{it.tries ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                          {it.ingestion_id ? shortId(it.ingestion_id) : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                          {it.pipeline_run_id ? shortId(it.pipeline_run_id) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                              onClick={() => onSelectBulkItem(it)}
                              disabled={!it.ingestion_id}
                              title="Open this item in single view"
                            >
                              Open
                            </button>
                            {it.ingestion_id ? (
                              <a
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                                href={`/dashboard/extract?ingestionId=${encodeURIComponent(String(it.ingestion_id))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Extract
                              </a>
                            ) : null}
                            {it.pipeline_run_id ? (
                              <a
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                                href={`/api/v1/pipeline/run/${encodeURIComponent(String(it.pipeline_run_id))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Run JSON
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!bulkItems.length ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400" colSpan={7}>
                        No items loaded yet (or backend not returning items). Try Refresh.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Showing first {Math.min(200, bulkItems.length)} items. Use your bulk items endpoint pagination for deeper views.
            </div>
          </section>
        ) : null}

        {/* Single results */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Description HTML</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Live preview (search + copy). Uses canonical field:{" "}
                    <span className="font-mono">descriptionHtml</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="Search in HTML…"
                  />
                  <button
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    onClick={handleCopyDescription}
                    disabled={!descriptionHtml}
                  >
                    {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy HTML"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline telemetry</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Module statuses, durations, and direct module output links (even on failure).
                  </p>
                </div>

                {pipelineSnapshot?.run?.id || pipelineRunId ? (
                  <div className="text-right text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Run: <span className="font-mono">{shortId(pipelineSnapshot?.run?.id || pipelineRunId)}</span>
                    </div>
                    <div>
                      Status: <span className="font-semibold">{pipelineSnapshot?.run?.status || "—"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">No run yet.</div>
                )}
              </div>

              <div className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                    <tr className="text-left">
                      <th className="px-3 py-2">Module</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Output</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleDurations.map((m: any) => (
                      <tr key={`${m.module_name}-${m.module_index}`} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{m.module_name}</span>{" "}
                          <span className="text-xs text-slate-400">#{m.module_index}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", statusPillTone(m.status))}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                          {m.duration_ms != null ? formatDuration(m.duration_ms) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {pipelineRunId ? (
                            <a
                              className="text-sm text-slate-700 underline hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-100"
                              href={`/api/v1/pipeline/run/${encodeURIComponent(pipelineRunId)}/output/${encodeURIComponent(String(m.module_index))}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View output
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                          {m.status === "failed" ? (
                            <span className="line-clamp-2">{typeof m.error === "string" ? m.error : JSON.stringify(m.error || "")}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {!moduleDurations.length ? (
                      <tr>
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400" colSpan={5}>
                          No module telemetry available yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {loading ? <div className="text-sm text-slate-600 dark:text-slate-300">Loading ingestion…</div> : null}
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">SEO</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-800 dark:text-slate-200">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">H1</div>
                  <div className="mt-0.5 break-words">{seo?.h1 ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Title</div>
                  <div className="mt-0.5 break-words">{seo?.pageTitle ?? seo?.title ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Meta description</div>
                  <div className="mt-0.5 break-words">{seo?.metaDescription ?? seo?.meta_description ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Short description</div>
                  <div className="mt-0.5 break-words">
                    {seo?.shortDescription ?? seo?.seoShortDescription ?? seo?.seo_short_description ?? "—"}
                  </div>
                </div>
              </div>

              {Array.isArray(features) && features.length > 0 ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Features</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-200">
                    {features.map((f: any, i: number) => (
                      <li key={i} className="break-words">
                        {String(f)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">No features found.</div>
              )}

              {parkedExtras.length > 0 ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">Extra SEO keys</summary>
                  <pre className="mt-2 max-h-[260px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                    {JSON.stringify(Object.fromEntries(parkedExtras), null, 2)}
                  </pre>
                </details>
              ) : (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">No extra SEO keys.</div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <details open={false}>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Raw ingestion JSON
                </summary>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  The full persisted ingestion row used by downstream modules.
                </div>
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-black p-3 text-[11px] text-white">
                  {JSON.stringify(jobData ?? null, null, 2)}
                </pre>
              </details>
            </section>
          </aside>
        </div>
	      </div>
	      </div>
	    </main>
  );
}
