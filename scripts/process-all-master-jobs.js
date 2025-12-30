// scripts/process-all-master-jobs.js
// Processes all jobs currently in bull:bulk-master:wait by reading the job payload
// and enqueuing bulk-item jobs for queued items.
// Usage:
//   REDIS_URL="..." SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/process-all-master-jobs.js

const IORedis = require("ioredis");
const { createClient } = require("@supabase/supabase-js");
const { Queue } = require("bullmq");

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set REDIS_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(2);
}

async function getJobIds(redis) {
  // Read the wait list for bulk-master
  return await redis.lrange("bull:bulk-master:wait", 0, -1);
}

async function readJobPayload(redis, jobId) {
  // Job details may be stored in a hash under bull:bulk-master:<id>
  const key = `bull:bulk-master:${jobId}`;
  const t = await redis.type(key);
  if (t === "hash") {
    const h = await redis.hgetall(key);
    if (h && h.data) {
      try {
        return JSON.parse(h.data);
      } catch {
        return h;
      }
    }
    return h;
  } else {
    const txt = await redis.get(key).catch(() => null);
    if (txt) {
      try {
        return JSON.parse(txt);
      } catch {
        return txt;
      }
    }
  }
  return null;
}

(async () => {
  const redis = new IORedis(REDIS_URL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const ids = await getJobIds(redis);
    if (!ids || ids.length === 0) {
      console.log("No master jobs waiting.");
      process.exit(0);
    }
    console.log("Found master wait job ids:", ids);

    // For enqueuing we use bullmq Queue with a ioredis instance
    const ioredis = new IORedis(REDIS_URL);
    const itemQueue = new Queue("bulk-item", { connection: ioredis });

    for (const jobId of ids) {
      try {
        const payload = await readJobPayload(redis, jobId);
        if (!payload) {
          console.warn("Could not read payload for job id", jobId);
          continue;
        }

        // Try to find the bulkJobId from common shapes:
        const bulkJobId =
          payload?.data?.bulkJobId ??
          payload?.bulkJobId ??
          (payload?.data && payload.data.bulkJobId) ??
          null;

        if (!bulkJobId) {
          console.warn("No bulkJobId in payload for master job", jobId, payload);
          continue;
        }

        console.log("Processing master payload for bulkJobId:", bulkJobId);

        // fetch queued items
        const { data: items, error } = await supabase
          .from("bulk_job_items")
          .select("id,item_index")
          .eq("bulk_job_id", bulkJobId)
          .eq("status", "queued")
          .order("item_index", { ascending: true });

        if (error) {
          console.error("Supabase error fetching items for", bulkJobId, error);
          continue;
        }

        if (!items || items.length === 0) {
          console.log("No queued items for", bulkJobId);
          // touch job updated_at
          await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
          continue;
        }

        const jobs = items.map((it) => ({
          name: "bulk-item",
          data: { bulkJobItemId: it.id },
          opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
        }));

        console.log(`Enqueuing ${jobs.length} items for bulkJob ${bulkJobId}`);
        // try addBulk with fallback to individual adds
        try {
          if (typeof itemQueue.addBulk === "function") {
            await itemQueue.addBulk(jobs);
          } else {
            for (const j of jobs) {
              await itemQueue.add(j.name, j.data, j.opts);
            }
          }
          // touch bulk_jobs.updated_at
          await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
        } catch (enqueueErr) {
          console.warn("addBulk failed, falling back to individual adds", enqueueErr);
          for (const j of jobs) {
            try {
              await itemQueue.add(j.name, j.data, j.opts);
            } catch (singleErr) {
              console.error("Failed to enqueue item", j.data, singleErr);
            }
          }
        }
      } catch (innerErr) {
        console.error("Error processing master job id", jobId, innerErr);
      }
    }

    await itemQueue.close();
    ioredis.disconnect();
    console.log("Done processing master jobs.");
    process.exit(0);
  } catch (e) {
    console.error("Unexpected error", e);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
})();
