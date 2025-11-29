// Simple Supabase server helper for AvidiaDescribe
// - Uses SERVICE_ROLE key (server only)
// - Exposes: saveIngestion, incrementUsageCounter, checkQuota
//
// IMPORTANT: keep SUPABASE_SERVICE_ROLE_KEY secret and only use on server side.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
// Fallback tenant id used when tenantId is null
const GLOBAL_TENANT_ID = process.env.SUPABASE_GLOBAL_TENANT_ID ?? "global";

if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/**
 * saveIngestion - non-destructive insertion that avoids inserting explicit NULLs
 */
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
    // Use explicit fallback tenant ID to avoid null inserts
    tenant_id: tenantId ?? GLOBAL_TENANT_ID,
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

  // Wrap payload in an array to match Supabase typings for insert/upsert calls
  const { data, error } = await supabase
    .from("product_ingestions")
    .insert([payload])
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

/**
 * incrementUsageCounter
 *
 * - Uses fallback tenant key instead of null
 * - Matches/updates by tenant_id + metric
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
  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;

  try {
    // Find existing counter row by tenantKey + metric
    const { data: existing, error: fetchErr } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("incrementUsageCounter: fetch error", fetchErr);
      throw fetchErr;
    }

    if (existing && typeof existing.count !== "undefined") {
      const newCount = Number(existing.count ?? 0) + Number(incrementBy);
      const { error: updateErr } = await supabase
        .from("usage_counters")
        .update({ count: newCount, updated_at: now })
        .eq("tenant_id", tenantKey)
        .eq("metric", metric);
      if (updateErr) {
        console.error("incrementUsageCounter: update error", updateErr);
        throw updateErr;
      }
      return true;
    } else {
      // Insert a new row for tenantKey+metric (wrap payload in array to match TS typings)
      const insertPayload: Record<string, any> = {
        tenant_id: tenantKey,
        metric,
        count: incrementBy,
        updated_at: now,
      };
      const { error: insertErr } = await supabase
        .from("usage_counters")
        .insert([insertPayload]);
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
 * - Uses fallback tenant key instead of null
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

  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;

  try {
    const { data, error } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

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
