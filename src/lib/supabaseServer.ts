// Simple Supabase server helper for AvidiaDescribe
// - Uses SERVICE_ROLE key (server only)
// - Exposes: saveIngestion, incrementUsageCounter, checkQuota
//
// IMPORTANT: keep SUPABASE_SERVICE_ROLE_KEY secret and only use on server side.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export async function saveIngestion({
  tenantId,
  type = "describe",
  status = "success",
  normalizedPayload,
  rawPayload,
  userId,
  sourceUrl,
}: {
  tenantId: string | null;
  type?: string;
  status?: "success" | "failed";
  normalizedPayload?: any;
  rawPayload?: any;
  userId?: string | null;
  sourceUrl?: string | null;
}) {
  if (!url || !serviceKey) return { id: null };

  const payload: Record<string, any> = {
    tenant_id: tenantId,
    user_id: userId ?? null,
    type,
    status,
    normalized_payload: normalizedPayload ?? null,
    raw_payload: rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    payload.source_url = sourceUrl;
  }

  const { data, error } = await supabase.from("product_ingestions").insert(payload).select("id").limit(1).maybeSingle();
  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

/**
 * incrementUsageCounter
 *
 * - Works without assuming an "id" column exists.
 * - Handles tenant_id === null by using IS NULL for queries/updates.
 * - Fetches existing row by (tenant_id, metric). If exists -> update count; else insert.
 */
export async function incrementUsageCounter({
  tenantId,
  metric = "describe_calls",
  incrementBy = 1,
}: {
  tenantId: string | null;
  metric?: string;
  incrementBy?: number;
}) {
  if (!url || !serviceKey) return null;

  const now = new Date().toISOString();

  try {
    // Build select query that handles NULL tenant_id properly
    let selectQuery = supabase.from("usage_counters").select("count").limit(1).maybeSingle();
    if (tenantId === null) {
      selectQuery = (selectQuery as any).is("tenant_id", null).eq("metric", metric);
    } else {
      selectQuery = (selectQuery as any).eq("tenant_id", tenantId).eq("metric", metric);
    }

    const { data: existing, error: fetchErr } = await selectQuery;
    if (fetchErr) {
      console.error("incrementUsageCounter: fetch error", fetchErr);
      throw fetchErr;
    }

    if (existing && typeof existing.count !== "undefined") {
      const newCount = Number(existing.count ?? 0) + Number(incrementBy);

      let updateQuery: any = supabase.from("usage_counters").update({ count: newCount, updated_at: now });
      if (tenantId === null) {
        updateQuery = updateQuery.is("tenant_id", null).eq("metric", metric);
      } else {
        updateQuery = updateQuery.eq("tenant_id", tenantId).eq("metric", metric);
      }

      const { error: updateErr } = await updateQuery;
      if (updateErr) {
        console.error("incrementUsageCounter: update error", updateErr);
        throw updateErr;
      }
      return true;
    } else {
      // Insert a new row
      const insertPayload: Record<string, any> = {
        tenant_id: tenantId,
        metric,
        count: incrementBy,
        updated_at: now,
      };
      const { error: insertErr } = await supabase.from("usage_counters").insert([insertPayload]);
      if (insertErr) {
        console.error("incrementUsageCounter: insert error", insertErr);
        throw insertErr;
      }
      return true;
    }
  } catch (err) {
    console.error("incrementUsageCounter unexpected error:", err);
    throw err;
  }
}

/**
 * checkQuota
 *
 * - Returns true if under the limit.
 * - Handles tenant_id === null by using IS NULL in the query.
 */
export async function checkQuota({
  tenantId,
  metric = "describe_calls",
  limit = Infinity,
}: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
}) {
  if (!url || !serviceKey) return true;

  try {
    let query: any = supabase.from("usage_counters").select("count").limit(1).maybeSingle();
    if (tenantId === null) {
      query = query.is("tenant_id", null).eq("metric", metric);
    } else {
      query = query.eq("tenant_id", tenantId).eq("metric", metric);
    }

    const { data, error } = await query;
    if (error) {
      console.error("checkQuota query error:", error);
      throw error;
    }

    const current = Number(data?.count ?? 0);
    return current < limit;
  } catch (err) {
    console.error("checkQuota unexpected error:", err);
    // Fail-open to avoid blocking when DB is unreachable; change if you prefer fail-closed
    return true;
  }
}
