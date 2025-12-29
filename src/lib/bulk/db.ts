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
  let query: any = supabase.from("bulk_job_items").select("*").eq("bulk_job_id", bulkJobId).order("item_index", { ascending: true });
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
 * NOTE: Supabase JS does not expose a direct `raw` expression API for atomic increments across all clients.
 * If you have a DB-side RPC (preferred) you can call it instead for atomic increments.
 * This implementation performs a read-then-update; it's appropriate for moderate concurrency.
 */
export async function incrementBulkCounters(bulkJobId: string, delta: { completed?: number; failed?: number }) {
  const supabase = getServiceSupabaseClient();

  // Read current counters
  const { data: current, error: readErr } = await supabase
    .from("bulk_jobs")
    .select("completed_items, failed_items")
    .eq("id", bulkJobId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!current) throw new Error("bulk_job_not_found");

  const completedNow = Number(current.completed_items ?? 0) + Number(delta.completed ?? 0);
  const failedNow = Number(current.failed_items ?? 0) + Number(delta.failed ?? 0);

  const { error: upErr } = await supabase
    .from("bulk_jobs")
    .update({ completed_items: completedNow, failed_items: failedNow, updated_at: new Date().toISOString() })
    .eq("id", bulkJobId);

  if (upErr) throw upErr;
  return true;
}
