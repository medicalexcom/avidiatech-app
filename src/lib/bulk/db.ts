/**
 * src/lib/bulk/db.ts
 *
 * Small server‑side DAL for bulk_jobs & bulk_job_items using the service Supabase client.
 *
 * In 2026-01 a NOT NULL constraint was added to bulk_jobs.org_id to prevent jobs from
 * being created without a tenant.  The createBulkJob helper now requires a non‑null
 * orgId and will throw an error if one is not provided.
 */

import { getServiceSupabaseClient } from "@/lib/supabase";
import type { BulkInputItem } from "./parse";

/**
 * createBulkJob
 *
 * Create a new bulk job row and insert its items.  The caller must provide a
 * valid tenant/org identifier (`orgId`); this helper will reject undefined or
 * empty values.  If you need to derive the tenant from the current Clerk
 * organisation, use resolveTenantIdForServerRequest() in your API route.
 */
export async function createBulkJob({
  orgId,
  name,
  createdBy,
  options = {},
  items,
}: {
  orgId: string; // orgId is required; null or undefined values will cause an error
  name?: string | null;
  createdBy?: string | null;
  options?: Record<string, any>;
  items: BulkInputItem[];
}) {
  // Defensive check: ensure orgId is a non-empty string
  if (!orgId) {
    throw new Error(
      "createBulkJob: orgId is required and cannot be null or undefined."
    );
  }

  const supabase = getServiceSupabaseClient();

  // Insert the bulk job; note org_id is always set, never null
  const { data: jobRow, error: jobErr } = await supabase
    .from("bulk_jobs")
    .insert([
      {
        org_id: orgId,
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
    const { error: insertErr } = await supabase
      .from("bulk_job_items")
      .insert(chunk);
    if (insertErr) throw insertErr;
  }

  return bulkJobId;
}

export async function getBulkJob(bulkJobId: string) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("bulk_jobs")
    .select("*")
    .eq("id", bulkJobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBulkItems(
  bulkJobId: string,
  opts?: { limit?: number; offset?: number }
) {
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

export async function updateBulkItemStatus(
  bulkJobItemId: string,
  updates: Record<string, any>
) {
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
 * Compatibility helper for bulk workers.  Updates the aggregate counters on
 * bulk_jobs.  Note that queued and in_progress items are ignored on your
 * current production schema because those columns do not exist.
 */
export async function incrementBulkCounters(
  bulkJobId: string,
  delta: {
    // legacy keys used by worker
    total?: number;
    completed?: number;
    failed?: number;

    // canonical keys
    total_items?: number;
    completed_items?: number;
    failed_items?: number;

    // accepted but ignored (to avoid schema errors on older DBs)
    queued?: number;
    in_progress?: number;
    queued_items?: number;
    in_progress_items?: number;
  }
) {
  const supabase = getServiceSupabaseClient();

  const toNum = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const clamp0 = (n: any) => Math.max(0, Number(n ?? 0));

  // Map legacy -> canonical (canonical wins)
  const dTotal = toNum(delta.total_items ?? delta.total);
  const dCompleted = toNum(delta.completed_items ?? delta.completed);
  const dFailed = toNum(delta.failed_items ?? delta.failed);

  // Read current counters (only the columns we know exist)
  const { data: cur, error: readErr } = await supabase
    .from("bulk_jobs")
    .select("id,total_items,completed_items,failed_items")
    .eq("id", bulkJobId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!cur) throw new Error("bulk_job_not_found");

  const updates: any = { updated_at: new Date().toISOString() };
  if (dTotal) updates.total_items = clamp0(cur.total_items) + dTotal;
  if (dCompleted) updates.completed_items = clamp0(cur.completed_items) + dCompleted;
  if (dFailed) updates.failed_items = clamp0(cur.failed_items) + dFailed;

  // nothing to do
  if (Object.keys(updates).length === 1) return true;

  const { error: updErr } = await supabase
    .from("bulk_jobs")
    .update(updates)
    .eq("id", bulkJobId);
  if (updErr) throw updErr;

  return true;
}
