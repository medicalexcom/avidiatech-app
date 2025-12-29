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
  const query = supabase.from("bulk_job_items").select("*").eq("bulk_job_id", bulkJobId).order("item_index", { ascending: true });
  if (opts?.limit) query.range(opts.offset ?? 0, (opts.offset ?? 0) + opts.limit - 1);
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

export async function incrementBulkCounters(bulkJobId: string, delta: { completed?: number; failed?: number }) {
  const supabase = getServiceSupabaseClient();
  // Use SQL to increment atomically
  const updates: Record<string, any> = {};
  if (typeof delta.completed === "number") updates.completed_items = (supabase.raw = undefined); // placeholder not used
  // We'll do a raw query for atomic increment
  const { error } = await supabase.rpc("bulk_jobs_increment_counters", {
    job_id: bulkJobId,
    inc_completed: delta.completed ?? 0,
    inc_failed: delta.failed ?? 0,
  }).catch(() => ({ error: null } as any));
  // NOTE: If you don't have the RPC, fallback to a simple update (safe for low concurrency)
  if (error) {
    const { data, error: upErr } = await supabase
      .from("bulk_jobs")
      .update({
        completed_items: (delta.completed ? `completed_items + ${delta.completed}` : undefined),
        failed_items: (delta.failed ? `failed_items + ${delta.failed}` : undefined),
      })
      .eq("id", bulkJobId);
    if (upErr) throw upErr;
    return data;
  }
  return true;
}
