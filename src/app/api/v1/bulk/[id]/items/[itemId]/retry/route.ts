import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { getQueue } from "@/lib/queue/bull";

/**
 * POST /api/v1/bulk/:id/items/:itemId/retry
 * Re-enqueues a single item (if found) into the "bulk-item" queue and resets its DB row to queued.
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const params = context?.params ?? {};
    const bulkJobId = String(params.id ?? "");
    const itemId = String(params.itemId ?? "");

    if (!bulkJobId || !itemId) {
      return NextResponse.json({ error: "Missing id or itemId" }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();

    // verify item belongs to job
    const { data: itemRow, error: itemErr } = await supabase
      .from("bulk_job_items")
      .select("*")
      .eq("id", itemId)
      .eq("bulk_job_id", bulkJobId)
      .maybeSingle();

    if (itemErr) throw itemErr;
    if (!itemRow) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // enqueue job to redis queue
    const q = getQueue("bulk-item");
    try {
      await q.add("bulk-item", { bulkJobItemId: itemId }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
    } catch (e) {
      console.error("enqueue error", e);
      return NextResponse.json({ error: "Failed to enqueue item", details: String(e?.message ?? e) }, { status: 500 });
    }

    // reset DB row to queued (clear last_error / timestamps)
    const { error: upErr } = await supabase
      .from("bulk_job_items")
      .update({ status: "queued", last_error: null, started_at: null, finished_at: null })
      .eq("id", itemId);

    if (upErr) {
      console.warn("Failed to update DB row after enqueue", upErr);
    }

    return NextResponse.json({ ok: true, itemId });
  } catch (err: any) {
    console.error("POST retry item error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
