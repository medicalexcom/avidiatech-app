#!/usr/bin/env node
/**
 * Requeue failed bulk_job_items with optional filters.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REDIS_URL=... node scripts/requeue-failed-items.js [--bulk-job-id=<id>] [--filter-error="<substring>"] [--limit=N] [--dry]
 *
 * Notes:
 *  - If --bulk-job-id is provided, the script only requeues failed items for that job.
 *  - If --filter-error is provided (and --bulk-job-id not given), the script fetches failed items, filters client-side by substring match on the JSON last_error.message, and requeues matches.
 *  - Default limit is 1000 (safety). Use --limit to change.
 *  - Requires SUPABASE_SERVICE_ROLE_KEY to update rows.
 */

const { createClient } = require("@supabase/supabase-js");
const IORedis = require("ioredis");
const { Queue } = require("bullmq");
const argv = require("minimist")(process.argv.slice(2));

const BULK_JOB_ID = argv["bulk-job-id"] || null;
const FILTER_ERROR = argv["filter-error"] || null;
const LIMIT = parseInt(argv.limit || argv.l || 1000, 10);
const DRY = !!argv.dry;

if (!process.env.REDIS_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFailedItemsByBulkJob(supabase, bulkJobId, limit) {
  const { data, error } = await supabase
    .from("bulk_job_items")
    .select("id, bulk_job_id, item_index, last_error")
    .eq("status", "failed")
    .eq("bulk_job_id", bulkJobId)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchFailedItemsCandidates(supabase, limit) {
  // fetch candidates (failed items) and filter client-side by last_error text
  const { data, error } = await supabase
    .from("bulk_job_items")
    .select("id, bulk_job_id, item_index, last_error")
    .eq("status", "failed")
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function extractLastErrorMessage(last_error) {
  if (!last_error) return "";
  try {
    if (typeof last_error === "string") return last_error;
    if (typeof last_error === "object") {
      // common shape: { message: "...", code: "..." }
      if (last_error.message) return String(last_error.message);
      return JSON.stringify(last_error);
    }
    return String(last_error);
  } catch {
    return "";
  }
}

(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    let items = [];

    if (BULK_JOB_ID) {
      items = await fetchFailedItemsByBulkJob(supabase, BULK_JOB_ID, LIMIT);
    } else if (FILTER_ERROR) {
      // client-side filter to avoid DB operator issues
      const candidates = await fetchFailedItemsCandidates(supabase, LIMIT);
      const needle = FILTER_ERROR.toLowerCase();
      items = candidates.filter((it) => {
        const msg = extractLastErrorMessage(it.last_error).toLowerCase();
        return msg.includes(needle);
      });
    } else {
      // default: fetch failed items up to LIMIT
      const { data, error } = await supabase
        .from("bulk_job_items")
        .select("id, bulk_job_id, item_index, last_error")
        .eq("status", "failed")
        .limit(LIMIT);
      if (error) throw error;
      items = data || [];
    }

    console.log(`Found ${items.length} failed items to requeue (limit ${LIMIT}).`);

    if (items.length === 0) {
      process.exit(0);
    }

    if (DRY) {
      console.log("Dry run. Items (ids):", items.map((i) => i.id));
      process.exit(0);
    }

    const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue("bulk-item", { connection });

    let requeued = 0;
    for (const item of items) {
      // Enqueue the job for worker consumption
      await queue.add(
        "process-bulk-item",
        { bulkJobItemId: item.id },
        { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
      );

      // Update DB row back to queued (service role key required)
      const { error: updateErr } = await supabase
        .from("bulk_job_items")
        .update({
          status: "queued",
          last_error: null,
          tries: 0,
          started_at: null,
          finished_at: null,
        })
        .eq("id", item.id);

      if (updateErr) {
        console.warn("Failed to update DB for item", item.id, updateErr.message || updateErr);
      } else {
        requeued++;
      }
    }

    await queue.close();
    connection.disconnect();

    console.log(`Requeued ${requeued} items.`);
    process.exit(0);
  } catch (err) {
    console.error("Error requeueing items:", err);
    process.exit(1);
  }
})();
