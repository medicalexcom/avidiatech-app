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

// Basic required env checks (fail-fast)
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}
if (!internalApiBase) {
  console.error("[bulk-item] FATAL: INTERNAL_API_BASE is not set. Please set INTERNAL_API_BASE and restart.");
  process.exit(1);
}
if (!SERVICE_API_KEY) {
  console.error(
    "[bulk-item] FATAL: service secret missing. Set PIPELINE_INTERNAL_SECRET (preferred) or SERVICE_API_KEY and restart."
  );
  process.exit(1);
}

if (process.env.DEBUG_BULK) {
  console.log("[bulk-item][debug] PIPELINE_INTERNAL_SECRET raw len:", String(RAW_PIPELINE_SECRET || "").length);
  console.log("[bulk-item][debug] PIPELINE_INTERNAL_SECRET clean len:", PIPELINE_INTERNAL_SECRET.length);
  console.log("[bulk-item][debug] SERVICE_API_KEY raw len:", String(RAW_SERVICE_API_KEY || "").length);
  console.log("[bulk-item][debug] SERVICE_API_KEY clean len:", SERVICE_API_KEY.length);
  console.log("[bulk-item][debug] INGEST_POLL_TIMEOUT_MS:", INGEST_POLL_TIMEOUT_MS);
  console.log("[bulk-item][debug] INGEST_RETRY_ON_TIMEOUT:", INGEST_RETRY_ON_TIMEOUT);
  console.log("[bulk-item][debug] INGEST_RETRY_MAX:", INGEST_RETRY_MAX);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/* ---- Helpers ---- */

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

function serviceHeaders() {
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

async function postIngest(itemUrl: string) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/ingest`;
  const normalized = normalizeAbsoluteUrl(itemUrl);

  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] postIngest POST", url, "payload.url=", normalized);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      url: normalized,
      persist: true,
      options: { includeSeo: true },
    }),
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

async function pollForIngestionJob(jobId: string, timeoutMs = INGEST_POLL_TIMEOUT_MS, intervalMs = INGEST_POLL_INTERVAL_MS) {
  const start = Date.now();
  let lastPayload: any = null;
  let lastStatus: number | null = null;

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase.replace(/\/$/, "")}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: serviceHeaders(),
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

async function startIngestAndReturnIngestionId(itemUrl: string) {
  let attempt = 0;
  let lastTimeoutPayload: any = null;

  while (true) {
    attempt++;

    const { res, text, json: j } = await postIngest(itemUrl);

    if (!res.ok) {
      const msg = j?.error ?? `ingest failed (${res.status})`;
      const err: any = new Error(msg);
      err.payload = { status: res.status, body: j, text };
      throw err;
    }

    const possibleIngestionId = j?.ingestionId ?? j?.id ?? j?.data?.id ?? j?.data?.ingestionId ?? null;

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
              INGEST_RETRY_ON_TIMEOUT &&
              attempt <= (1 + INGEST_RETRY_MAX);

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
          INGEST_RETRY_ON_TIMEOUT &&
          attempt <= (1 + INGEST_RETRY_MAX);

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

async function startPipeline(ingestionId: string, steps: string[]) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/pipeline/run`;
  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] startPipeline POST", url, "ingestionId=", ingestionId);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      ingestionId,
      triggerModule: "seo",
      steps,
      options: {},
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
      headers: serviceHeaders(),
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
      ingestionId = await startIngestAndReturnIngestionId(item.input_url);
      if (!ingestionId) throw new Error("ingestion creation returned no id");
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    const steps =
      bulkJob.options?.mode === "full" || String(bulkJob.options?.mode) === "full"
        ? ["extract", "seo", "audit", "import", "monitor", "price"]
        : ["extract", "seo"];

    const pipelineRunId = await startPipeline(ingestionId, steps);
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
    const payload = err?.payload ?? null;

    console.error("[bulk-item] processing error", {
      bulkJobItemId,
      error: err?.message ?? err,
      payload,
    });

    await markItem(bulkJobItemId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: payload ? { message: String(err?.message || err), payload } : { message: String(err?.message || err) },
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
    console.error(`[bulk-item] failed ${job.id}`, err?.message ?? err);
  });

  console.log(`[bulk-item] worker started (concurrency=${concurrency})`);
})();
