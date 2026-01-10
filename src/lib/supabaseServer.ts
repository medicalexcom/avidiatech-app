// src/lib/supabaseServer.ts
// Central Supabase server helper used across ingestion/import flows.
//
// Important change: do not silently insert a fallback tenant by default.
// Set SUPABASE_GLOBAL_TENANT_ID in env to enable a global fallback for local/dev only.
// Otherwise saveIngestion will throw if tenantId is null to enforce app-level tenant validation.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Fallback tenant id used ONLY when explicitly configured in env (dev convenience).
// If not set, we treat tenant as required for ingestion creation.
const GLOBAL_TENANT_ID = process.env.SUPABASE_GLOBAL_TENANT_ID ?? null;

if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = (url && serviceKey) ? createClient(url, serviceKey, {
  auth: { persistSession: false },
}) : null;

/**
 * saveIngestion - non-destructive insertion that enforces tenant presence.
 *
 * - tenantId must be provided by callers (UI, bulk worker, API). If tenantId is null/undefined
 *   and SUPABASE_GLOBAL_TENANT_ID is NOT set, this function will throw an error to prevent
 *   accidental NULL tenant inserts.
 * - You may set SUPABASE_GLOBAL_TENANT_ID in non-production environments if you intentionally
 *   want a fallback tenant for legacy/one-off workflows.
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
  if (!url || !serviceKey || !supabase) return { id: null };

  // Determine the effective tenant key:
  const effectiveTenant = tenantId ?? GLOBAL_TENANT_ID ?? null;

  // Enforce presence: do not allow NULL tenant unless GLOBAL_TENANT_ID explicitly configured.
  if (!effectiveTenant) {
    const err = new Error("missing_tenant_id_for_ingestion");
    // Log for observability
    console.error("saveIngestion blocked: missing tenant and no GLOBAL_TENANT_ID configured");
    throw err;
  }

  const payload: Record<string, any> = {
    tenant_id: effectiveTenant,
    user_id: userId ?? null,
    // Keep same shape as existing code to avoid breaking callers
    export_type: type,
    status,
    normalized_payload: normalizedPayload ?? null,
    raw_payload: rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    payload.source_url = sourceUrl;
  }

  // Insert and return created id
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
 * incrementUsageCounter - uses tenant fallback same as above.
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
  if (!url || !serviceKey || !supabase) return null;

  const now = new Date().toISOString();
  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;

  if (!tenantKey) {
    console.error("incrementUsageCounter blocked: missing tenantId and no GLOBAL_TENANT_ID configured");
    throw new Error("missing_tenant_id_for_ingestion");
  }

  try {
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
        console.error("incrementUsageCounter: updateErr", updateErr);
        throw updateErr;
      }
      return { ok: true, count: newCount };
    } else {
      const { data, error } = await supabase
        .from("usage_counters")
        .insert([{ tenant_id: tenantKey, metric, count: incrementBy, created_at: now, updated_at: now }])
        .select("*");
      if (error) {
        console.error("incrementUsageCounter: insert error", error);
        throw error;
      }
      return { ok: true, count: incrementBy };
    }
  } catch (e) {
    console.error("incrementUsageCounter unexpected error", e);
    throw e;
  }
}

/**
 * checkQuota - returns boolean whether tenant is within quota.
 *
 * - opts.limit may be a number or Infinity. If limit is Infinity or not provided, this function returns true.
 * - On DB error this function returns true (fail-open).
 */
export async function checkQuota(opts: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
}): Promise<boolean> {
  const { tenantId, metric = "describe_calls", limit = Infinity } = opts;

  // If limit is infinite, allow
  if (!isFinite(limit)) return true;

  if (!url || !serviceKey || !supabase) {
    // Fail-open if DB not configured
    return true;
  }

  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;
  if (!tenantKey) {
    // If no tenant and no global fallback configured, be conservative and allow (fail-open)
    return true;
  }

  try {
    const { data, error } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("checkQuota db error, failing open", error);
      return true;
    }

    const current = Number((data as any)?.count ?? 0);
    return current < Number(limit);
  } catch (e) {
    console.warn("checkQuota unexpected error, failing open", e);
    return true;
  }
}
