// src/workers/bulkMasterWorker.ts
// Node worker: run as a separate process (pm2 / systemd / container).
// Usage: NODE_ENV=production node ./dist/workers/bulkMasterWorker.js
import { getQueue, getRedisConnection } from "@/lib/queue/bull";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for bulk workers");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const qMaster = getQueue("bulk-master");
const qItem = getQueue("bulk-item");

async function handle(job: any) {
  const { bulkJobId } = job.data;
  console.log("bulk-master processing", bulkJobId);

  // mark job running
  await supabase.from("bulk_jobs").update({ status: "running", meta: { started_at: new Date().toISOString() } }).eq("id", bulkJobId);

  // fetch queued items
  const { data: items } = await supabase
    .from("bulk_job_items")
    .select("id")
    .eq("bulk_job_id", bulkJobId)
    .eq("status", "queued")
    .order("item_index", { ascending: true });

  if (!items || items.length === 0) {
    // nothing to do
    await supabase.from("bulk_jobs").update({ status: "succeeded" }).eq("id", bulkJobId);
    return;
  }

  // enqueue items in batches
  const batchSize = parseInt(process.env.BULK_ENQUEUE_BATCH_SIZE || "200", 10);
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const jobs = chunk.map((it: any) => ({
      name: "bulk-item",
      data: { bulkJobItemId: it.id },
      opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
    }));

    // use addBulk if available
    try {
      await qItem.addBulk(jobs);
    } catch (err) {
      // fallback: add individually
      for (const jobSpec of jobs) {
        try {
          await qItem.add(jobSpec.name, jobSpec.data, jobSpec.opts);
        } catch (e) {
          console.error("enqueue item failed", e);
        }
      }
    }
  }

  console.log(`Enqueued ${items.length} items for bulk job ${bulkJobId}`);
}

(async () => {
  // create a lightweight worker that listens for master jobs (use bullmq Worker)
  // require here to avoid bundling issues in Next
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require("bullmq");
  const connection = getRedisConnection();
  const worker = new Worker("bulk-master", async (job: any) => handle(job), { connection, concurrency: 2 });

  worker.on("completed", (job: any) => {
    console.log("master job completed", job.id);
  });
  worker.on("failed", (job: any, err: any) => {
    console.error("master job failed", job.id, err);
  });

  console.log("bulk-master worker started");
})();
