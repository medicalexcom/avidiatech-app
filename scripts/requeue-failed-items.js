/**
 * Requeue failed bulk_job_items so workers can process them again.
 *
 * Usage:
 *   REDIS_URL="rediss://:...@..." SUPABASE_URL="https://<...>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="..." node scripts/requeue-failed-items.js
 *
 * Notes:
 * - This script uses BullMQ to enqueue properly (do not push directly into Redis lists).
 * - It sets status => 'queued' in the DB for each item it enqueues.
 * - Test with LIMIT (see the SQL below) before a full run.
 */

const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.REDIS_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Set REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  try {
    // Supabase client (service role key needed to update rows)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Fetch failed items (adjust LIMIT / WHERE as needed)
    const { data: failedItems, error: selectErr } = await supabase
      .from("bulk_job_items")
      .select("id, bulk_job_id, item_index, last_error")
      .eq("status", "failed")
      .limit(1000); // change or remove limit for full requeue

    if (selectErr) throw selectErr;

    console.log(`Found ${failedItems.length} failed items (limited to 1000).`);

    if (failedItems.length === 0) {
      console.log("Nothing to requeue.");
      process.exit(0);
    }

    // Create BullMQ queue
    const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue("bulk-item", { connection });

    let requeued = 0;
    for (const item of failedItems) {
      // add job to queue with the item id (worker code should read DB by id)
      // You may choose a specific job name, or let it be default
      await queue.add("process-bulk-item", { bulkJobItemId: item.id }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });

      // mark item row as queued and clear last_error (service role key required)
      const { error: updateErr } = await supabase
        .from("bulk_job_items")
        .update({ status: "queued", last_error: null, tries: 0, started_at: null, finished_at: null })
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
