// src/workers/bulkItemWorker.ts
//
// Bulk item worker: end-to-end per-item processing for bulk jobs.
//
// Updated behavior:
// - Uses bulkJob.org_id as requestedTenantId for billing (fixes "No tenant membership found").
// - Owners bypass subscription/quota, but usage is still tracked (implemented in billing.ts).
// - Normalizes input URLs to reduce "Invalid URL" / "Only absolute URLs" errors.
//
// Hardening (2026-01):
// - Sanitize internal service secret before sending it in x-service-api-key header.
//   We have observed env contamination with ANSI escape codes and/or whitespace/newlines which
//   caused middleware to return 401 {"error":"unauthorized"}.
//
// NEW (2026-01-03):
// - On ingest polling timeout, auto-retry by re-POSTing /api/v1/ingest once (configurable) and
//   include rich diagnostics in bulk_job_items.last_error.
// - Improve pipeline start error capture (read text fallback; keep JSON if present).
// - Increase default ingest polling timeout via envs.
//
// NEW (2026-01-06):
// - Normalize thrown errors so UI/logs never show "[object Object]".
//   We always derive a meaningful message and preserve payload shape.
//
// NEW (2026-01-06): resiliency improvements
// - Per-domain concurrency limit to avoid hammering a single host.
// - Transient retry wrapper around POST /api/v1/ingest to retry render-timeouts and 5xx.
//
// NEW (2026-01-07): pipeline options forwarding
// - Forward bulk job / item options into pipeline run metadata so import/module toggles and
//   platform options are available to the pipeline-runner and internal modules.
// - Compute pipeline steps from merged options (bulk job options + per-item metadata override).

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { getRedisConnection } from "@/lib/queue/bull";
import { incrementBulkCounters } from "@/lib/bulk/db";
import { requireSubscriptionAndUsage } from "@/lib/billing";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function stripAnsiAndTrim(v: any): string {
  if (v == null) return "";
  return String(v).replace(ANSI_REGEX, "").trim();
}

function safeJsonStringify(v: any, maxLen = 8000) {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + "\n…(truncated)";
  } catch {
    return String(v);
  }
}

function normalizeErrorMessage(err: any): string {
  if (!err) return "unknown_error";
  if (typeof err === "string") return err;

  if (typeof err?.message === "string" && err.message.trim()) return err.message;

  const nested =
    err?.payload?.error?.message ||
    err?.payload?.message ||
    err?.error?.message ||
    err?.detail ||
    err?.error;

  if (typeof nested === "string" && nested.trim()) return nested;

  const code = err?.payload?.error?.code || err?.error?.code;
  if (typeof code === "string" && code.trim()) return code;

  const asJson = safeJsonStringify(err, 1200);
  if (asJson && asJson !== "[object Object]") return asJson;

  return "unknown_error_object";
}

function normalizeErrorPayload(err: any) {
  const payload = err?.payload ?? null;
  const core =
    payload ??
    (typeof err === "object"
      ? { ...err }
      : { value: err });

  return {
    message: normalizeErrorMessage(err),
    payload: core,
  };
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Prefer canonical PIPELINE_INTERNAL_SECRET first (middleware expects this),
// then SERVICE_API_KEY, then NEXT_PUBLIC_SERVICE_API_KEY as last-resort fallback.
const RAW_PIPELINE_SECRET = process.env.PIPELINE_INTERNAL_SECRET || "";
const RAW_SERVICE_API_KEY = process.env.SERVICE_API_KEY || "";
const RAW_NEXT_PUBLIC_SERVICE_API_KEY = process.env.NEXT_PUBLIC_SERVICE_API_KEY || "";

const PIPELINE_INTERNAL_SECRET = stripAnsiAndTrim(RAW_PIPELINE_SECRET);
const SERVICE_API_KEY = stripAnsiAndTrim(
  PIPELINE_INTERNAL_SECRET || RAW_SERVICE_API_KEY || RAW_NEXT_PUBLIC_SERVICE_API_KEY
);

// INTERNAL_API_BASE is required for the worker to call internal endpoints
const internalApiBase = process.env.INTERNAL_API_BASE || ""; // e.g. https://app.example.com

// Bulk ingest tuning
const INGEST_POLL_TIMEOUT_MS = parseInt(process.env.BULK_INGEST_POLL_TIMEOUT_MS || "900000", 10); // 15 min default
const INGEST_POLL_INTERVAL_MS = parseInt(process.env.BULK_INGEST_POLL_INTERVAL_MS || "3000", 10);
const INGEST_RETRY_ON_TIMEOUT = (process.env.BULK_INGEST_RETRY_ON_TIMEOUT || "true").toLowerCase() !== "false";
const INGEST_RETRY_MAX = Math.max(0, parseInt(process.env.BULK_INGEST_RETRY_MAX || "1", 10)); // retries after timeout

// Per-domain concurrency defaults (to avoid hammering one site)
const DOMAIN_CONCURRENCY_LIMIT = Math.max(1, parseInt(process.env.BULK_DOMAIN_CONCURRENCY_LIMIT || "2", 10));
const DOMAIN_CONCURRENCY_WAIT_MS = Math.max(200, parseInt(process.env.BULK_DOMAIN_CONCURRENCY_WAIT_MS || "250", 10));

/* ---- Domain concurrency limiter ---- */
// Simple in-memory domain concurrency map. Suitable for single-process workers.
// For multi-process deployments you'd need a shared rate limiter (redis/DB).
const domainConcurrency = new Map<string, number>();

function domainFromUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    return new URL(String(u)).hostname;
  } catch {
    return null;
  }
}

/**
 * Acquire a slot for a domain. Returns a release function to call when done.
 * If domain can't be determined, returns a no-op release.
 */
async function acquireDomainSlot(url: string, maxWaitMs = 15000): Promise<() => void> {
  const domain = domainFromUrl(url);
  if (!domain) return () => {};

  const start = Date.now();
  while (true) {
    const cur = domainConcurrency.get(domain) ?? 0;
    if (cur < DOMAIN_CONCURRENCY_LIMIT) {
      domainConcurrency.set(domain, cur + 1);
      return () => {
        const now = domainConcurrency.get(domain) ?? 1;
        if (now <= 1) domainConcurrency.delete(domain);
        else domainConcurrency.set(domain, now - 1);
      };
    }
    if (Date.now() - start > maxWaitMs) {
      // Give up waiting and return a no-op release to avoid deadlock
      return () => {};
    }
    await new Promise((r) => setTimeout(r, DOMAIN_CONCURRENCY_WAIT_MS));
  }
}

/* ---- Helpers ---- */

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

async function markItem(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("bulk_job_items").update(updates).eq("id", id);
  if (error) {
    console.warn("markItem update error", error);
  }
}

async function fetchItemRow(bulkJobItemId: string) {
  const { data, error } = await supabase.from("bulk_job_items").select("*").eq("id", bulkJobItemId).maybeSingle();
  if (error) throw error;
  return data as any;
}

async function fetchBulkJob(bulkJobId: string) {
  const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", bulkJobId).maybeSingle();
  if (error) throw error;
  return data as any;
}

/**
 * Build headers for internal service calls.
 * - Always include content-type.
 * - Include x-service-api-key when available.
 * - Include x-pipeline-secret for internal endpoints when provided.
 */
function buildServiceHeaders(includePipelineSecret = false): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (SERVICE_API_KEY) {
    h["x-service-api-key"] = SERVICE_API_KEY;
    if (process.env.DEBUG_BULK) {
      console.log("[bulk-item][debug] will send header 'x-service-api-key' length:", SERVICE_API_KEY.length);
    }
  } else {
    if (process.env.DEBUG_BULK) {
      console.log("[bulk-item][debug] no service key available; header will NOT be sent");
    }
  }
  if (includePipelineSecret && PIPELINE_INTERNAL_SECRET) {
    h["x-pipeline-secret"] = PIPELINE_INTERNAL_SECRET;
  }
  return h;
}

function normalizeAbsoluteUrl(input: string): string {
  const s = String(input || "").trim();
  if (!s) return s;

  try {
    const u = new URL(s);
    return u.toString();
  } catch {
    try {
      const u = new URL(`https://${s}`);
      return u.toString();
    } catch {
      return s;
    }
  }
}

/* ---- Ingest: POST and transient retry wrapper ---- */

/**
 * postIngest
 * - Accepts tenantId and includes it in the request body so server-side ingestion creation
 *   can set tenant_id on the created row.
 */
async function postIngest(itemUrl: string, tenantId: string | null) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/ingest`;
  const normalized = normalizeAbsoluteUrl(itemUrl);

  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] postIngest POST", url, "payload.url=", normalized, "tenant_id=", tenantId);
  }

  const body: any = {
    url: normalized,
    persist: true,
    options: { includeSeo: true },
    // Include tenant context explicitly so ingestion creation uses it
    tenantId: tenantId ?? null,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: buildServiceHeaders(true), // include pipeline secret for internal ingest
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { res, text, json, normalizedUrl: normalized };
}

/**
 * tryPostIngestWithRetries
 * - Acquire per-domain slot
 * - Retry transient failures (render-timeout, status 0, 5xx, network throws)
 * - Exponential backoff between attempts
 * - Throws an Error with payload if still failing after retries
 */
async function tryPostIngestWithRetries(itemUrl: string, maxAttempts = 3, tenantId: string | null = null) {
  let attempt = 0;
  let lastErr: any = null;

  const release = await acquireDomainSlot(itemUrl);
  try {
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const { res, text, json: j, normalizedUrl } = await postIngest(itemUrl, tenantId);

        // If success or normal non-transient error, return as usual
        if (res.ok) {
          return { res, text, json: j, normalizedUrl };
        }

        // Determine if transient:
        // - res.status === 0 (network)
        // - 5xx server errors
        // - text contains known render-timeout/network indicators
        const isTransient =
          res.status === 0 ||
          (res.status >= 500 && res.status < 600) ||
          /render-timeout|timeout|ENOTFOUND|ECONNRESET|ERR_SOCKET_NOT_CONNECTED/i.test(text || String(j || ""));

        if (!isTransient) {
          // Non-transient -> return the response so caller handles it
          return { res, text, json: j, normalizedUrl };
        }

        lastErr = { res, text, json: j, normalizedUrl };

        if (process.env.DEBUG_BULK) {
          console.warn("[bulk-item][debug] transient ingest POST detected, will retry", { attempt, itemUrl, status: res.status });
        }

        // backoff then retry
        const backoffMs = Math.min(5000, 250 * Math.pow(2, attempt - 1));
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      } catch (e: any) {
        // Network/throwable error - considered transient
        lastErr = e;
        if (process.env.DEBUG_BULK) {
          console.warn("[bulk-item][debug] postIngest threw, will retry", { attempt, itemUrl, err: String(e?.message || e) });
        }
        const backoffMs = Math.min(5000, 250 * Math.pow(2, attempt - 1));
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
    }

    // After retries, throw a descriptive error
    const err: any = new Error("ingest_post_transient_failed");
    err.payload = lastErr;
    throw err;
  } finally {
    try {
      if (typeof release === "function") release();
    } catch {
      // ignore
    }
  }
}

/* ---- Ingest polling ---- */

async function pollForIngestionJob(jobId: string, timeoutMs = INGEST_POLL_TIMEOUT_MS, intervalMs = INGEST_POLL_INTERVAL_MS) {
  const start = Date.now();
  let lastPayload: any = null;
  let lastStatus: number | null = null;

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase.replace(/\/$/, "")}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: buildServiceHeaders(true),
    });

    lastStatus = res.status;
    const text = await res.text().catch(() => "");
    let j: any = null;
    try {
      j = text ? JSON.parse(text) : null;
    } catch {
      j = null;
    }
    lastPayload = j ?? text ?? null;

    if (res.status === 200) {
      return j?.ingestionId ?? j?.id ?? null;
    }
    if (res.status === 409) {
      const msg = j?.error ?? j?.detail ?? "ingest_engine_error";
      const err: any = new Error(msg);
      err.payload = j ?? { status: res.status, text };
      throw err;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  const err: any = new Error("ingest job timeout");
  err.payload = { jobId, lastStatus, lastPayload };
  throw err;
}

/* ---- Start ingest (uses retry wrapper) ---- */

async function startIngestAndReturnIngestionId(itemUrl: string, tenantId: string | null) {
  let attempt = 0;
  let lastTimeoutPayload: any = null;

  while (true) {
    attempt++;

    // Use the transient retry wrapper that also enforces per-domain concurrency.
    const { res, text, json: j } = await tryPostIngestWithRetries(itemUrl, 3, tenantId);

    if (!res.ok) {
      const msg = j?.error ?? `ingest failed (${res.status})`;
      const err: any = new Error(msg);
      err.payload = { status: res.status, body: j, text };
      throw err;
    }

    const possibleIngestionId =
      j?.ingestionId ?? j?.id ?? j?.data?.id ?? j?.data?.ingestionId ?? null;

    if (possibleIngestionId) {
      if (j?.status === "accepted" || res.status === 202) {
        const jobId = j?.jobId ?? j?.ingestionId ?? possibleIngestionId;

        try {
          const ing = await pollForIngestionJob(jobId);
          return ing;
        } catch (e: any) {
          const msg = String(e?.message ?? e);

          if (msg === "ingest job timeout") {
            lastTimeoutPayload = e?.payload ?? null;

            const canRetry =
              INGEST_RETRY_ON_TIMEOUT && attempt <= (1 + INGEST_RETRY_MAX);

            if (canRetry) {
              console.warn("[bulk-item] ingest poll timeout; retrying ingest POST", {
                attempt,
                jobId,
                lastTimeoutPayload,
              });
              continue;
            }

            const err: any = new Error("ingest job timeout");
            err.payload = {
              attempts: attempt,
              initialResponse: j,
              lastTimeoutPayload,
            };
            throw err;
          }

          throw e;
        }
      }
      return possibleIngestionId;
    }

    const jobId = j?.jobId ?? j?.job?.id ?? null;
    if (!jobId) {
      const err: any = new Error("ingest did not return an ingestionId or jobId");
      err.payload = { status: res.status, body: j, text };
      throw err;
    }

    try {
      return await pollForIngestionJob(jobId);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg === "ingest job timeout") {
        lastTimeoutPayload = e?.payload ?? null;
        const canRetry =
          INGEST_RETRY_ON_TIMEOUT && attempt <= (1 + INGEST_RETRY_MAX);

        if (canRetry) {
          console.warn("[bulk-item] ingest poll timeout; retrying ingest POST", {
            attempt,
            jobId,
            lastTimeoutPayload,
          });
          continue;
        }

        const err: any = new Error("ingest job timeout");
        err.payload = { attempts: attempt, initialResponse: j, lastTimeoutPayload };
        throw err;
      }
      throw e;
    }
  }
}

/* ---- Pipeline start/poll (now supports forwarding options) ---- */

/**
 * startPipeline
 * - ingestionId: ingestion to run pipeline for
 * - steps: ordered list of module names to execute
 * - options: free-form options forwarded into pipeline metadata.payload.options
 */
async function startPipeline(ingestionId: string, steps: string[], options: Record<string, any> = {}) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/pipeline/run`;
  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] startPipeline POST", url, "ingestionId=", ingestionId, "steps=", steps, "options=", options);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: buildServiceHeaders(true),
    body: JSON.stringify({
      ingestionId,
      triggerModule: "seo",
      steps,
      options,
    }),
  });

  // Read text first to preserve non-JSON error bodies
  const text = await res.text().catch(() => "");
  let j: any = null;
  try {
    j = text ? JSON.parse(text) : null;
  } catch {
    j = null;
  }

  if (!res.ok) {
    const err: any = new Error(j?.error ?? `pipeline start failed (${res.status})`);
    err.payload = { status: res.status, body: j, text: text || null };
    throw err;
  }

  const pipelineRunId = j?.pipelineRunId;
  if (!pipelineRunId) {
    const err: any = new Error("pipeline start returned no pipelineRunId");
    err.payload = { status: res.status, body: j, text: text || null };
    throw err;
  }

  return String(pipelineRunId);
}

async function pollPipeline(runId: string, timeoutMs = 1800_000, intervalMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase.replace(/\/$/, "")}/api/v1/pipeline/run/${encodeURIComponent(runId)}`, {
      headers: buildServiceHeaders(true),
    });

    const text = await res.text().catch(() => "");
    let j: any = null;
    try {
      j = text ? JSON.parse(text) : null;
    } catch {
      j = null;
    }

    if (res.ok && j?.run) {
      const status = j.run.status;
      if (status === "succeeded" || status === "failed") return j;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("pipeline poll timeout");
}

/* ---- Core handler ---- */

async function handleJob(job: any) {
  const { bulkJobItemId } = job.data;
  console.log("[bulk-item] processing", bulkJobItemId);

  const item = await fetchItemRow(bulkJobItemId);
  if (!item) throw new Error("bulk_job_item not found");

  const bulkJob = await fetchBulkJob(item.bulk_job_id);
  if (!bulkJob) throw new Error("parent bulk_job not found");

  await markItem(bulkJobItemId, {
    status: "in_progress",
    started_at: new Date().toISOString(),
    tries: (item.tries ?? 0) + 1,
  });

  try {
    const userId = bulkJob.created_by;

    // Canonical tenant context for billing/usage: use org_id from bulk_jobs
    let tenantId: string | null = bulkJob.org_id ?? null;
    let isOwner = false;

    try {
      if (!tenantId || tenantId === "<ORG_ID_FOUND>") {
        const { data: tm, error: tmErr } = await supabase
          .from("team_members")
          .select("tenant_id, role")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (!tmErr && tm && tm.length > 0) {
          tenantId = tm[0].tenant_id;
        }
      }

      if (tenantId) {
        const { data: roleRows, error: roleErr } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", userId)
          .eq("tenant_id", tenantId)
          .limit(1);
        if (!roleErr && roleRows && roleRows.length > 0) {
          const role = roleRows[0].role;
          if (role === "owner" || role === "admin") isOwner = true;
        }
      }
    } catch (lookupErr: any) {
      console.warn("[bulk-item] tenant/role lookup failed, continuing:", lookupErr?.message ?? lookupErr);
    }

    // If we still cannot resolve a tenant, fail this item early and record clear error.
    if (!tenantId) {
      const norm = normalizeErrorPayload({ message: "missing_tenant_for_bulk_item", payload: { info: "No tenant resolved from bulk job or team membership" } });
      console.error("[bulk-item] missing tenant, aborting item", { bulkJobItemId, payload: norm.payload });
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: norm,
      });
      await incrementBulkCounters(item.bulk_job_id, { failed: 1 }).catch((e) =>
        console.warn("incrementBulkCounters failed on missing tenant", e)
      );
      return;
    }

    await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantId ?? undefined,
      feature: "ingestion" as any,
      increment: 1,
      userEmail: bulkJob.options?.requested_by_email ?? undefined,
    });

    if (process.env.DEBUG_BULK && isOwner) {
      console.log("[bulk-item][debug] owner/admin detected for user", userId, "tenant", tenantId);
    }

    // Ingestion: create if missing
    let ingestionId = item.ingestion_id ?? null;
    if (!ingestionId) {
      ingestionId = await startIngestAndReturnIngestionId(item.input_url, tenantId);
      if (!ingestionId) throw new Error("ingestion creation returned no id");
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    // Merge bulk job options with per-item metadata.options (item-level overrides)
    const mergedOptions: Record<string, any> = {
      ...(bulkJob.options ?? {}),
      ...(item.metadata?.options ?? {}),
    };

    // Compute pipeline steps from merged options. Defaults:
    // - If options.mode === "full" (or unspecified and bulkJob.options.mode === 'full'), include audit/import/monitor/price
    // - Individual include flags (includeAudit/includeImport/includeMonitor/includePrice) can override.
    const modeFull = String(mergedOptions?.mode ?? "").toLowerCase() === "full";
    const steps: string[] = ["extract", "seo"];

    if (mergedOptions?.includeAudit !== false && (mergedOptions.includeAudit === true || modeFull || mergedOptions.includeAudit === undefined)) {
      steps.push("audit");
    }

    if (mergedOptions?.includeImport !== false && (mergedOptions.includeImport === true || modeFull || mergedOptions.includeImport === undefined)) {
      steps.push("import");
    }

    if (mergedOptions?.includeMonitor !== false && (mergedOptions.includeMonitor === true || modeFull || mergedOptions.includeMonitor === undefined)) {
      steps.push("monitor");
    }

    if (mergedOptions?.includePrice !== false && (mergedOptions.includePrice === true || modeFull || mergedOptions.includePrice === undefined)) {
      steps.push("price");
    }

    if (process.env.DEBUG_BULK) {
      console.log("[bulk-item][debug] computed steps for item", { bulkJobId: bulkJob.id, itemId: bulkJobItemId, steps, mergedOptions });
    }

    const pipelineRunId = await startPipeline(ingestionId, steps, mergedOptions);
    await markItem(bulkJobItemId, { pipeline_run_id: pipelineRunId });

    const snap = await pollPipeline(pipelineRunId);
    const finalStatus = snap?.run?.status;

    if (finalStatus === "succeeded") {
      await markItem(bulkJobItemId, { status: "succeeded", finished_at: new Date().toISOString() });
      await incrementBulkCounters(item.bulk_job_id, { completed: 1 }).catch((e) =>
        console.warn("incrementBulkCounters failed (completed)", e)
      );
    } else {
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { pipelineStatus: finalStatus, run: snap?.run ?? null, modules: snap?.modules ?? null },
      });
      await incrementBulkCounters(item.bulk_job_id, { failed: 1 }).catch((e) =>
        console.warn("incrementBulkCounters failed (failed)", e)
      );
    }
  } catch (err: any) {
    const norm = normalizeErrorPayload(err);

    console.error("[bulk-item] processing error", {
      bulkJobItemId,
      error: norm.message,
      payload: norm.payload,
    });

    await markItem(bulkJobItemId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: norm,
    });

    await incrementBulkCounters(item.bulk_job_id, { failed: 1 }).catch((e) =>
      console.warn("incrementBulkCounters failed on exception", e)
    );
  }
}

/* ---- Worker bootstrap ---- */

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");

  const connection = getRedisConnection();
  const concurrency = parseInt(process.env.BULK_ITEM_CONCURRENCY || "8", 10);

  const worker = new Worker(
    "bulk-item",
    async (job: any) => {
      await handleJob(job);
    },
    {
      connection,
      concurrency,
    }
  );

  worker.on("completed", (job: any) => {
    console.log(`[bulk-item] completed ${job.id}`);
  });

  worker.on("failed", (job: any, err: any) => {
    const norm = normalizeErrorPayload(err);
    console.error(`[bulk-item] failed ${job.id}`, norm.message);
  });

  console.log(`[bulk-item] worker started (concurrency=${concurrency})`);
})();
