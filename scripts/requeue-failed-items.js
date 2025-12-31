/**
 * Requeue failed bulk_job_items with optional filters.
 *
 * Usage:
 *   REDIS_URL="rediss://:..." SUPABASE_URL="https://<...>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/requeue-failed-items.js [--bulk-job-id=<id>] [--filter-error="<substring>"] [--limit=N]
 *
 * Examples:
 *   node scripts/requeue-failed-items.js --bulk-job-id=7af... --limit=100
 *   node scripts/requeue-failed-items.js --filter-error="No tenant membership" --limit=500
 *
 * Safety:
 *  - Defaults to limit 1000. Adjust as needed.
 *  - Script updates DB status back to 'queued' and enqueues jobs into BullMQ queue "bulk-item".
 */

const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { createClient } = require("@supabase/supabase-js");

const argv = require("minimist")(process.argv.slice(2));
const BULK_JOB_ID = argv["bulk-job-id"] || null;
const FILTER_ERROR = argv["filter-error"] || null;
const LIMIT = parseInt(argv.limit || argv.l || 1000, 10);

if (!process.env.REDIS_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Build query
    let query = supabase
      .from("bulk_job_items")
      .select("id, bulk_job_id, item_index, last_error")
      .eq("status", "failed")
      .limit(LIMIT);

    if (BULK_JOB_ID) query = query.eq("bulk_job_id", BULK_JOB_ID);
    if (FILTER_ERROR) query = query.filter("last_error->>message", "cs", FILTER_ERROR); // case-sensitive contains
    // fallback: if filter didn't apply, use ILIKE via rpc or client-side filter if needed

    const { data: failedItems, error: selectErr } = await query;

    if (selectErr) throw selectErr;

    console.log(`Found ${failedItems.length} failed items (limit ${LIMIT}).`);

    if (!failedItems || failedItems.length === 0) {
      console.log("No items to requeue.");
      process.exit(0);
    }

    // setup BullMQ
    const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue("bulk-item", { connection });

    let requeued = 0;
    for (const item of failedItems) {
      // add job to queue
      await queue.add("process-bulk-item", { bulkJobItemId: item.id }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });

      // update DB status
      const { error: updateErr } = await supabase
        .from("bulk_job_items")
        .update({
          status: "queued",
          last_error: null,
          tries: 0,
          started_at: null,
          finished_at: null
        })
        .eq("id", item.id);

      if (updateErr) {
        console.warn("Failed to update DB for item", item.id, updateErr.message || updateErr);
      } else {
        requeued++;
      }
    }

    console.log(`Requeued ${requeued} items.`);
    await queue.close();
    connection.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error requeueing items:", err);
    process.exit(1);
  }
})();
