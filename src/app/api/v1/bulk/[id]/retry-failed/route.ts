import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { getQueue } from "@/lib/queue/bull";

/**
 * POST /api/v1/bulk/:id/retry-failed
 * Finds items with status = 'failed' (or optionally queued) and re-enqueues them in bulk.
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const params = context?.params ?? {};
    const bulkJobId = String(params.id ?? "");
    if (!bulkJobId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getServiceSupabaseClient();

    // Pull failed items
    const { data: failedItems, error: err } = await supabase
      .from("bulk_job_items")
      .select("id,item_index,status")
      .eq("bulk_job_id", bulkJobId)
      .eq("status", "failed")
      .order("item_index", { ascending: true });

    if (err) throw err;

    if (!failedItems || failedItems.length === 0) {
      return NextResponse.json({ ok: true, message: "No failed items to retry" });
    }

    const q = getQueue("bulk-item");

    const jobs = failedItems.map((it: any) => ({
      name: "bulk-item",
      data: { bulkJobItemId: it.id },
      opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
    }));

    try {
      await q.addBulk(jobs);
    } catch (e) {
      // fallback to individual adds
      for (const jobSpec of jobs) {
        try {
          // add individually
          await q.add(jobSpec.name, jobSpec.data, jobSpec.opts);
        } catch (innerErr) {
          console.warn("Failed to enqueue individual job", innerErr);
        }
      }
    }

    // Reset DB rows to queued
    const ids = failedItems.map((f: any) => f.id);
    const { error: upErr } = await supabase
      .from("bulk_job_items")
      .update({ status: "queued", last_error: null, started_at: null, finished_at: null })
      .in("id", ids);

    if (upErr) {
      console.warn("Failed to reset DB rows to queued after enqueue", upErr);
    }

    return NextResponse.json({ ok: true, enqueued: failedItems.length });
  } catch (err: any) {
    console.error("POST retry-failed error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
