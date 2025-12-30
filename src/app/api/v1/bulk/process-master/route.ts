import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { Queue } from "bullmq";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * POST/GET /api/v1/bulk/process-master
 *
 * One-shot handler to process any waiting 'bulk-master' jobs:
 * - Reads redis list 'bull:bulk-master:wait'
 * - For each job id, reads job payload (bull:bulk-master:<id>) and extracts bulkJobId
 * - Queries Supabase for bulk_job_items where status = 'queued' and enqueues them into 'bulk-item'
 * - Updates bulk_jobs.updated_at to show activity
 *
 * Protected by SERVICE_API_KEY header: x-service-api-key must equal process.env.SERVICE_API_KEY
 *
 * Use for emergency/manual triggering if you cannot run a persistent master worker.
 */

function requireServiceKey(req: NextRequest) {
  const provided = req.headers.get("x-service-api-key") || "";
  const expected = process.env.SERVICE_API_KEY || "";
  return !!(expected && provided && expected === provided);
}

async function readMasterJobPayload(redis: Redis, jobId: string) {
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

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    if (!requireServiceKey(req)) {
      return NextResponse.json({ error: "Unauthorized - missing service key" }, { status: 401 });
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return NextResponse.json({ error: "Server misconfigured - REDIS_URL missing" }, { status: 500 });
    }

    const redis = new Redis(redisUrl);

    // Get all master wait job ids
    const jobIds = await redis.lrange("bull:bulk-master:wait", 0, -1);
    if (!jobIds || jobIds.length === 0) {
      await redis.disconnect();
      return NextResponse.json({ ok: true, message: "No master jobs waiting", found: 0 });
    }

    const supabase = getServiceSupabaseClient();
    // Create an ioredis instance for the Queue connection (we reuse the redis instance)
    const itemQueue = new Queue("bulk-item", { connection: redis });

    const results: Array<{ bulkJobId: string; enqueued: number; errors?: any[] }> = [];

    for (const jid of jobIds) {
      try {
        const payload = await readMasterJobPayload(redis, jid);
        // The payload shapes can vary; try common shapes
        const bulkJobId =
          payload?.data?.bulkJobId ??
          payload?.bulkJobId ??
          (payload?.data && payload.data.bulkJobId) ??
          null;

        if (!bulkJobId) {
          results.push({ bulkJobId: "unknown", enqueued: 0, errors: ["no bulkJobId in payload", payload] });
          continue;
        }

        // fetch queued items for this bulk job
        const { data: items, error } = await supabase
          .from("bulk_job_items")
          .select("id,item_index")
          .eq("bulk_job_id", bulkJobId)
          .eq("status", "queued")
          .order("item_index", { ascending: true });

        if (error) {
          results.push({ bulkJobId, enqueued: 0, errors: [String(error.message || error)] });
          continue;
        }

        if (!items || items.length === 0) {
          // touch job updated_at so UI shows activity
          await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
          results.push({ bulkJobId, enqueued: 0 });
          continue;
        }

        // build jobs and try addBulk
        const jobs = items.map((it: any) => ({
          name: "bulk-item",
          data: { bulkJobItemId: it.id },
          opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
        }));

        let enqueued = 0;
        try {
          if (typeof itemQueue.addBulk === "function") {
            await itemQueue.addBulk(jobs);
            enqueued = jobs.length;
          } else {
            for (const j of jobs) {
              await itemQueue.add(j.name, j.data, j.opts);
              enqueued++;
            }
          }
        } catch (enqueueErr) {
          // fallback to adding individually
          const errors: any[] = [];
          for (const j of jobs) {
            try {
              await itemQueue.add(j.name, j.data, j.opts);
              enqueued++;
            } catch (e) {
              errors.push(String(e?.message ?? e));
            }
          }
          results.push({ bulkJobId, enqueued, errors: errors.length ? errors : undefined });
          // touch job
          await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
          continue;
        }

        // touch job updated_at
        await supabase.from("bulk_jobs").update({ updated_at: new Date().toISOString() }).eq("id", bulkJobId);
        results.push({ bulkJobId, enqueued });
      } catch (inner) {
        results.push({ bulkJobId: "error-reading", enqueued: 0, errors: [String(inner?.message ?? inner)] });
      }
    }

    // close queue connection and redis
    try {
      await itemQueue.close();
    } catch {}
    await redis.disconnect();

    return NextResponse.json({ ok: true, processedMasterCount: jobIds.length, results });
  } catch (err: any) {
    console.error("process-master error", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
