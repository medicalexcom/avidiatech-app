// src/workers/bulkItemWorker.ts
//
// Bulk item worker: end-to-end per-item processing for bulk jobs.
//
// This version:
// - Prefers PIPELINE_INTERNAL_SECRET as the canonical secret.
// - Fail-fast on missing INTERNAL_API_BASE or secret.
// - Optional debug logging controlled by DEBUG_BULK (prints header presence and length only).
// - No secret values are printed.

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { getRedisConnection } from "@/lib/queue/bull";
import { incrementBulkCounters } from "@/lib/bulk/db";
import { requireSubscriptionAndUsage } from "@/lib/billing";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Prefer canonical PIPELINE_INTERNAL_SECRET, but allow SERVICE_API_KEY or NEXT_PUBLIC_SERVICE_API_KEY as fallbacks
const SERVICE_API_KEY =
  process.env.SERVICE_API_KEY || process.env.PIPELINE_INTERNAL_SECRET || process.env.NEXT_PUBLIC_SERVICE_API_KEY || "";

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
  console.error("[bulk-item] FATAL: service secret missing. Set SERVICE_API_KEY or PIPELINE_INTERNAL_SECRET and restart.");
  process.exit(1);
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

async function startIngestAndReturnIngestionId(itemUrl: string) {
  const url = `${internalApiBase.replace(/\/$/, "")}/api/v1/ingest`;
  if (process.env.DEBUG_BULK) {
    console.log("[bulk-item][debug] startIngest POST", url, "payload.url=", itemUrl);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ url: itemUrl, persist: true, options: { includeSeo: true } }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = j?.error ?? `ingest failed (${res.status})`;
    throw new Error(msg);
  }

  // If ingestionId returned directly
  const possibleIngestionId = j?.ingestionId ?? j?.id ?? j?.data?.id ?? j?.data?.ingestionId ?? null;
  if (possibleIngestionId) {
    if (j?.status === "accepted" || res.status === 202) {
      // need to poll job id
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

async function pollForIngestionJob(jobId: string, timeoutMs = 120_000, intervalMs = 3000) {
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
      // terminal error from ingest engine
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

  // Fetch item row
  const item = await fetchItemRow(bulkJobItemId);
  if (!item) {
    throw new Error("bulk_job_item not found");
  }

  // Fetch bulk job for metadata (created_by, options)
  const bulkJob = await fetchBulkJob(item.bulk_job_id);
  if (!bulkJob) {
    throw new Error("parent bulk_job not found");
  }

  // Mark started
  await markItem(bulkJobItemId, {
    status: "in_progress",
    started_at: new Date().toISOString(),
    tries: (item.tries ?? 0) + 1,
  });

  try {
    // Billing / quota: attempt to consume one ingestion quota for the user who created the bulk job
    // We add a safe owner/admin bypass and a retry path for usage_counters issues.
    const userId = bulkJob.created_by;
    // Try to resolve tenantId (prefer bulkJob.org_id)
    let tenantId: string | null = bulkJob.org_id ?? null;
    let isOwner = false;

    try {
      // If org_id missing or placeholder, try to lookup from team_members
      if (!tenantId || tenantId === "<ORG_ID_FOUND>") {
        const { data: tm, error: tmErr } = await supabase
          .from("team_members")
          .select("tenant_id, role")
          .eq("user_id", userId)
          .limit(1);
        if (!tmErr && tm && tm.length > 0) {
          tenantId = tm[0].tenant_id;
        }
      }

      // Check role for bypass
      if (tenantId) {
        const { data: roleRows, error: roleErr } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", userId)
          .eq("tenant_id", tenantId)
          .limit(1);
        if (!roleErr && roleRows && roleRows.length > 0) {
          const role = roleRows[0].role;
          if (role === "owner" || role === "admin") {
            isOwner = true;
          }
        }
      }
    } catch (lookupErr) {
      // don't block processing if lookup fails; log and continue to requireSubscriptionAndUsage path
      console.warn("[bulk-item] tenant/role lookup failed, continuing:", lookupErr?.message ?? lookupErr);
    }

    if (isOwner) {
      console.log("[bulk-item] owner/admin bypass - skipping subscription check for user", userId);
      // proceed without calling requireSubscriptionAndUsage
    } else {
      // Normal path: call billing function, with a guarded retry for common schema/unique-key issues
      try {
        await requireSubscriptionAndUsage({
          userId,
          requestedTenantId: bulkJob.options?.source_tenant ?? undefined,
          feature: "ingestion" as any,
          increment: 1,
          userEmail: bulkJob.options?.requested_by_email ?? undefined,
        });
      } catch (usageErr: any) {
        const usageMsg = String(usageErr?.message ?? usageErr ?? "").toLowerCase();
        console.warn("[bulk-item] quota/usage initial check failed", { bulkJobItemId, err: usageMsg });

        // If the error looks like a schema/usage_counters/unique key problem, attempt a safe upsert/repair and retry once.
        const needsRepair =
          usageMsg.includes("usage_counters") ||
          usageMsg.includes("period_start") ||
          usageMsg.includes("unique constraint") ||
          usageMsg.includes("duplicate key");

        if (needsRepair && tenantId) {
          try {
            // Check if a usage_counters row exists for tenantId
            const { data: existing, error: selErr } = await supabase
              .from("usage_counters")
              .select("tenant_id")
              .eq("tenant_id", tenantId)
              .limit(1);

            if (selErr) {
              console.warn("[bulk-item] usage_counters select error (non-fatal):", selErr);
            }

            if (!existing || existing.length === 0) {
              // Attempt to insert a minimal row. If tenant_id is uuid-typed in DB but tenantId is text, this may fail.
              // We ignore insert errors (they will be handled by the retry of requireSubscriptionAndUsage).
              try {
                await supabase.from("usage_counters").insert({
                  tenant_id: tenantId,
                  period_start: new Date().toISOString(),
                });
                console.log("[bulk-item] created minimal usage_counters row for tenant:", tenantId);
              } catch (insErr) {
                // ignore insert error (likely type/constraint) but log for diagnostics
                console.warn("[bulk-item] usage_counters insert warning (ignored):", insErr?.message ?? insErr);
              }
            }
          } catch (repairErr) {
            console.warn("[bulk-item] attempted usage_counters repair failed:", repairErr?.message ?? repairErr);
          }

          // Retry the billing call once
          try {
            await requireSubscriptionAndUsage({
              userId,
              requestedTenantId: bulkJob.options?.source_tenant ?? undefined,
              feature: "ingestion" as any,
              increment: 1,
              userEmail: bulkJob.options?.requested_by_email ?? undefined,
            });
          } catch (usageErr2: any) {
            // Still failing after repair attempt: mark item failed as before
            console.warn("[bulk-item] quota/usage check failed after repair", { bulkJobItemId, err: String(usageErr2?.message ?? usageErr2) });
            await markItem(bulkJobItemId, {
              status: "failed",
              finished_at: new Date().toISOString(),
              last_error: { message: String(usageErr2?.message ?? usageErr2), code: usageErr2?.code ?? "quota_failed" },
            });
            try {
              await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
            } catch (incErr) {
              console.warn("incrementBulkCounters failed after quota error", incErr);
            }
            return;
          }
        } else {
          // Non-repairable usage error (e.g., genuinely out of quota/subscription). Mark failed.
          await markItem(bulkJobItemId, {
            status: "failed",
            finished_at: new Date().toISOString(),
            last_error: { message: String(usageErr?.message ?? usageErr), code: usageErr?.code ?? "quota_failed" },
          });
          try {
            await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
          } catch (incErr) {
            console.warn("incrementBulkCounters failed after quota error", incErr);
          }
          return;
        }
      }
    }

    // Ingestion: create if missing
    let ingestionId = item.ingestion_id ?? null;
    if (!ingestionId) {
      ingestionId = await startIngestAndReturnIngestionId(item.input_url);
      if (!ingestionId) throw new Error("ingestion creation returned no id");
      await markItem(bulkJobItemId, { ingestion_id: ingestionId });
    }

    // Determine steps (default to extract+seo; allow bulkJob.options.mode === 'full')
    const steps =
      bulkJob.options?.mode === "full" || String(bulkJob.options?.mode) === "full"
        ? ["extract", "seo", "audit", "import", "monitor", "price"]
        : ["extract", "seo"];

    // Start pipeline
    const pipelineRunId = await startPipeline(ingestionId, steps);
    await markItem(bulkJobItemId, { pipeline_run_id: pipelineRunId });

    // Poll pipeline until terminal
    const snap = await pollPipeline(pipelineRunId);

    const finalStatus = snap?.run?.status;
    if (finalStatus === "succeeded") {
      await markItem(bulkJobItemId, { status: "succeeded", finished_at: new Date().toISOString() });
      try {
        await incrementBulkCounters(item.bulk_job_id, { completed: 1 });
      } catch (incErr) {
        console.warn("incrementBulkCounters failed (completed)", incErr);
      }
    } else {
      // pipeline failed: capture run + modules for diagnostics
      await markItem(bulkJobItemId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: { pipelineStatus: finalStatus, run: snap?.run ?? null, modules: snap?.modules ?? null },
      });
      try {
        await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
      } catch (incErr) {
        console.warn("incrementBulkCounters failed (failed)", incErr);
      }
    }
  } catch (err: any) {
    console.error("[bulk-item] processing error", { bulkJobItemId, error: err?.message ?? err });
    await markItem(bulkJobItemId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: { message: String(err?.message || err) },
    });
    try {
      await incrementBulkCounters(item.bulk_job_id, { failed: 1 });
    } catch (incErr) {
      console.warn("incrementBulkCounters failed on exception", incErr);
    }
  }
}

/* ---- Worker bootstrap ---- */

(async () => {
  // Lazy require to avoid bundling issues if this file is imported in Next runtime
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
