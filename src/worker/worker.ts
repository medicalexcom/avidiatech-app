/**
 * Worker process to run background jobs for connector syncs and import processing.
 *
 * Run with ts-node (recommended for dev):
 *   npx ts-node --transpile-only src/worker/worker.ts
 *
 * Production: compile this TS to JS and run with node or use PM2/systemd.
 *
 * Required env:
 * - REDIS_URL (e.g. redis://localhost:6379)
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Notes:
 * - This worker is MVP: it demonstrates job lifecycle and DB updates.
 * - Replace placeholder processing with your own connector adapters and mapping logic.
 */

import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Helper: mark job status and optionally insert simple import_rows
async function processImportJob(jobId: any) {
  // set processing
  await supaAdmin.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

  // Placeholder: simulate processing time and create a small import_rows sample
  await new Promise((r) => setTimeout(r, 3000));

  // Example: insert a single import_rows row (replace with your real parsing & mapping)
  try {
    await supaAdmin.from("import_rows").insert({
      job_id: jobId,
      row_number: 1,
      status: "success",
      data: { sku: "SAMPLE-001", title: "Sample product", price: "19.99" },
    });
  } catch (e) {
    // ignore
  }

  // mark succeeded
  await supaAdmin.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
}

async function processConnectorSync(integrationId: string, jobId: any) {
  // set the import_job status processing
  await supaAdmin.from("import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

  // Placeholder: fetch integration and pretend to sync a few products
  const { data: integration } = await supaAdmin.from("integrations").select("*").eq("id", integrationId).single();

  // Simulate work
  await new Promise((r) => setTimeout(r, 4000));

  // For demo insert a few rows referencing jobId (replace with real provider fetch and mapping)
  await supaAdmin.from("import_rows").insert([
    { job_id: jobId, row_number: 1, status: "success", data: { sku: "SYNC-001", title: `${integration?.provider} product 1` } },
    { job_id: jobId, row_number: 2, status: "success", data: { sku: "SYNC-002", title: `${integration?.provider} product 2` } },
  ]);

  // mark import job completed
  await supaAdmin.from("import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);

  // update integration last_synced_at
  await supaAdmin.from("integrations").update({ last_synced_at: new Date().toISOString(), status: "ready" }).eq("id", integrationId);
}

async function startWorkers() {
  console.log("Starting workers (REDIS_URL=", REDIS_URL, ")");

  const connectorWorker = new Worker(
    "connector-sync",
    async (job: any) => {
      console.log("connector-sync worker got job:", job.id, job.data);
      const { integrationId, jobId } = job.data;
      await processConnectorSync(integrationId, jobId);
      return { ok: true };
    },
    { connection: REDIS_URL }
  );

  const importWorker = new Worker(
    "import-process",
    async (job: any) => {
      console.log("import-process worker got job:", job.id, job.data);
      const { jobId } = job.data;
      await processImportJob(jobId);
      return { ok: true };
    },
    { connection: REDIS_URL }
  );

  connectorWorker.on("completed", (job) => console.log("connector-sync completed", job.id));
  connectorWorker.on("failed", (job, err) => console.error("connector-sync failed", job?.id, err));
  importWorker.on("completed", (job) => console.log("import-process completed", job.id));
  importWorker.on("failed", (job, err) => console.error("import-process failed", job?.id, err));
}

startWorkers().catch((e) => {
  console.error("Worker startup failed", e);
  process.exit(1);
});
