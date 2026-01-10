// scripts/requeue-bulk-items.js
// Re-enqueue queued (and optionally failed) bulk items for a given bulkJobId.
// Usage:
//   NODE_ENV=production REDIS_URL="..." SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/requeue-bulk-items.js <BULK_JOB_ID>
//
// NOTE: Run this from a secure environment. SUPABASE_SERVICE_ROLE_KEY is powerful.

const { createClient } = require("@supabase/supabase-js");
const IORedis = require("ioredis");
const { Queue } = require("bullmq");

async function main() {
  const bulkJobId = process.argv[2];
  if (!bulkJobId) {
    console.error("Usage: node scripts/requeue-bulk-items.js <BULK_JOB_ID>");
    process.exit(2);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const REDIS_URL = process.env.REDIS_URL;

  if (!SUPABASE_URL || !SUPABASE_KEY || !REDIS_URL) {
    console.error("Missing env. Provide SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and REDIS_URL.");
    process.exit(2);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Fetching queued items for bulk job:", bulkJobId);

  const { data: items, error } = await supabase
    .from("bulk_job_items")
    .select("id,status,item_index")
    .eq("bulk_job_id", bulkJobId)
    .in("status", ["queued", "failed"]) // include failed if you want to retry them too
    .order("item_index", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log("No queued/failed items found for this bulk job.");
    process.exit(0);
  }

  console.log(`Found ${items.length} items. Connecting to Redis and enqueueing...`);

  const connection = new IORedis(REDIS_URL, {
    // optional: configure TLS or other options here if required by your provider
    // tls: { rejectUnauthorized: false },
  });

  const queue = new Queue("bulk-item", { connection });

  // build jobs for addBulk
  const jobs = items.map((it) => ({
    name: "bulk-item",
    data: { bulkJobItemId: it.id },
    opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  }));

  try {
    // Try addBulk (atomic-ish)
    await queue.addBulk(jobs);
    console.log("Enqueued jobs via addBulk.");

    // Mark any failed items back to queued, reset last_error/started/finished timestamps
    const ids = items.map((i) => i.id);
    const { error: upErr } = await supabase
      .from("bulk_job_items")
      .update({ status: "queued", last_error: null, started_at: null, finished_at: null })
      .in("id", ids);

    if (upErr) {
      console.warn("Warning: could not update DB rows after enqueue:", upErr);
    } else {
      console.log("Updated DB rows to status=queued for re-enqueued items.");
    }
  } catch (e) {
    console.error("Failed to enqueue items:", e);
    process.exit(1);
  } finally {
    try {
      await queue.close();
      connection.disconnect();
    } catch {}
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
