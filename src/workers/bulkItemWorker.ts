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

  // If it already parses, keep as-is
  try {
    const u = new URL(s);
    return u.toString();
  } catch {
    // If missing scheme, try https://
    try {
      const u = new URL(`https://${s}`);
      return u.toString();
    } catch {
      return s; // let ingest validate and return a clear error
    }
  }
}

async function startIngestAndReturnIngestionId(itemUrl: string) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/ingest`;
  const normalized = normalizeAbsoluteUrl(itemUrl);

  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] startIngest POST", url, "payload.url=", normalized);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ url: normalized, persist: true, options: { includeSeo: true } }),
  });

  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = j?.error ?? `ingest failed (${res.status})`;
    throw new Error(msg);
  }

  const possibleIngestionId = j?.ingestionId ?? j?.id ?? j?.data?.id ?? j?.data?.ingestionId ?? null;

  if (possibleIngestionId) {
    if (j?.status === "accepted" || res.status === 202) {
      const jobId = j?.jobId ?? j?.ingestionId ?? possibleIngestionId;
      const ing = await pollForIngestionJob(jobId);
      return ing;
    }
    return possibleIngestionId;
  }

  const jobId = j?.jobId ?? j?.job?.id ?? null;
  if (!jobId) throw new Error("ingest did not return an ingestionId or jobId");
  return await pollForIngestionJob(jobId);
}

async function pollForIngestionJob(jobId: string, timeoutMs = 1200_000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase.replace(/\/$/, "")}/api/v1/ingest/job/${encodeURIComponent(jobId)}`, {
      headers: serviceHeaders(),
    });

    const j = await res.json().catch(() => null);

    if (res.status === 200) {
      return j?.ingestionId ?? j?.id ?? null;
    }
    if (res.status === 409) {
      const msg = j?.error ?? j?.detail ?? "ingest_engine_error";
      const err: any = new Error(msg);
      err.payload = j;
      throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("ingest job timeout");
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

  const j = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(j?.error ?? `pipeline start failed (${res.status})`);
  }
  return String(j.pipelineRunId);
}

async function pollPipeline(runId: string, timeoutMs = 180_000, intervalMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${internalApiBase.replace(/\/$/, "")}/api/v1/pipeline/run/${encodeURIComponent(runId)}`, {
      headers: serviceHeaders(),
    });
    const j = await res.json().catch(() => null);
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
      // Optional: if org_id missing, fall back to first membership
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

    // Even if owner/admin, we still want USAGE tracked. With the updated billing.ts,
    // owners bypass quota/subscription but still increment usage counters.
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
    console.error("[bulk-item] processing error", { bulkJobItemId, error: err?.message ?? err });
    await markItem(bulkJobItemId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: { message: String(err?.message || err) },
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
