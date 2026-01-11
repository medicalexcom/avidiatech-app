// src/lib/bulk/db.ts
// Small server-side DAL for bulk_jobs & bulk_job_items using service Supabase client.

import { getServiceSupabaseClient } from "@/lib/supabase";
import type { BulkInputItem } from "./parse";

export async function createBulkJob({
  orgId,
  name,
  createdBy,
  options = {},
  items,
}: {
  orgId?: string | null;
  name?: string | null;
  createdBy?: string | null;
  options?: Record<string, any>;
  items: BulkInputItem[];
}) {
  const supabase = getServiceSupabaseClient();

  const { data: jobRow, error: jobErr } = await supabase
    .from("bulk_jobs")
    .insert([
      {
        org_id: orgId ?? null,
        name: name ?? null,
        created_by: createdBy ?? null,
        options,
        total_items: items.length,
      },
    ])
    .select("*")
    .single();

  if (jobErr) throw jobErr;

  const bulkJobId = (jobRow as any).id;

  // batch insert items
  const toInsert = items.map((it, idx) => ({
    bulk_job_id: bulkJobId,
    item_index: idx,
    input_url: it.input_url,
    metadata: it.metadata ?? {},
    idempotency_key: it.idempotency_key ?? null,
  }));

  // Insert in chunks to avoid giant payloads
  const chunkSize = 500;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error: insertErr } = await supabase.from("bulk_job_items").insert(chunk);
    if (insertErr) throw insertErr;
  }

  return bulkJobId;
}

export async function getBulkJob(bulkJobId: string) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", bulkJobId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBulkItems(bulkJobId: string, opts?: { limit?: number; offset?: number }) {
  const supabase = getServiceSupabaseClient();
  let query: any = supabase
    .from("bulk_job_items")
    .select("*")
    .eq("bulk_job_id", bulkJobId)
    .order("item_index", { ascending: true });
  if (typeof opts?.limit === "number") {
    const from = opts.offset ?? 0;
    const to = from + opts.limit - 1;
    query = query.range(from, to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateBulkItemStatus(bulkJobItemId: string, updates: Record<string, any>) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("bulk_job_items")
    .update(updates)
    .eq("id", bulkJobItemId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * incrementBulkCounters
 *
 * Best-effort counters update for bulk_jobs.*_items fields.
 * This exists because the bulk worker imports it.
 *
 * Notes:
 * - This is not perfectly atomic (Supabase-js lacks raw SQL increment for all environments).
 * - It is safe and idempotent enough for dashboards when combined with periodic recompute.
 * - `delta` values are applied as: new = max(0, old + delta)
 */
export async function incrementBulkCounters(
  bulkJobId: string,
  delta: {
    total_items?: number;
    completed_items?: number;
    failed_items?: number;
    queued_items?: number;
    in_progress_items?: number;
  }
) {
  const supabase = getServiceSupabaseClient();

  // Read current counters
  const { data: cur, error: readErr } = await supabase
    .from("bulk_jobs")
    .select("id,total_items,completed_items,failed_items,queued_items,in_progress_items")
    .eq("id", bulkJobId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!cur) throw new Error("bulk_job_not_found");

  const clamp0 = (n: any) => Math.max(0, Number(n ?? 0));

  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (typeof delta.total_items === "number") updates.total_items = clamp0(cur.total_items) + delta.total_items;
  if (typeof delta.completed_items === "number") updates.completed_items = clamp0(cur.completed_items) + delta.completed_items;
  if (typeof delta.failed_items === "number") updates.failed_items = clamp0(cur.failed_items) + delta.failed_items;
  if (typeof delta.queued_items === "number") updates.queued_items = clamp0(cur.queued_items) + delta.queued_items;
  if (typeof delta.in_progress_items === "number")
    updates.in_progress_items = clamp0(cur.in_progress_items) + delta.in_progress_items;

  // Ensure no negatives
  for (const k of ["total_items", "completed_items", "failed_items", "queued_items", "in_progress_items"]) {
    if (k in updates) updates[k] = clamp0(updates[k]);
  }

  const { error: updErr } = await supabase.from("bulk_jobs").update(updates).eq("id", bulkJobId);
  if (updErr) throw updErr;

  return true;
}

/**
 * recomputeBulkJobCounters
 *
 * More accurate than incrementBulkCounters: recomputes counts from bulk_job_items.
 * Useful for reconciliation/repair and can be called from scripts or admin endpoints.
 */
export async function recomputeBulkJobCounters(bulkJobId: string) {
  const supabase = getServiceSupabaseClient();

  // Fetch statuses for this bulk job
  const { data: items, error: itemsErr } = await supabase
    .from("bulk_job_items")
    .select("status")
    .eq("bulk_job_id", bulkJobId);

  if (itemsErr) throw itemsErr;

  const counts: Record<string, number> = {};
  for (const it of items ?? []) {
    const s = String((it as any).status ?? "unknown");
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const completed = (counts["completed"] ?? 0) + (counts["succeeded"] ?? 0);
  const failed = counts["failed"] ?? 0;
  const queued = counts["queued"] ?? 0;
  const running = (counts["running"] ?? 0) + (counts["in_progress"] ?? 0);

  const updates: any = {
    total_items: (items ?? []).length,
    completed_items: completed,
    failed_items: failed,
    queued_items: queued,
    in_progress_items: running,
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabase.from("bulk_jobs").update(updates).eq("id", bulkJobId);
  if (updErr) throw updErr;

  return { ok: true, counts, updates };
}
