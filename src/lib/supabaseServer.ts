// Simple Supabase server helper for AvidiaDescribe
// - Uses SERVICE_ROLE key (server only)
// - Exposes: saveIngestion, incrementUsageCounter, checkQuota
//
// IMPORTANT: keep SUPABASE_SERVICE_ROLE_KEY secret and only use on server side.
//
// 2026-01 tenant enforcement update:
// - We must NOT create product_ingestions rows without a real tenant_id because:
//   * Import requires tenant context (connectors) and returns 422 otherwise
//   * Null tenants cause recurring pipeline failures
// - Previous behavior used SUPABASE_GLOBAL_TENANT_ID fallback ("global"), which hides the bug
//   and breaks multi-tenant correctness.
// - New behavior:
//   * By default, saveIngestion requires tenantId (strict)
//   * Optional escape hatch: allowGlobalFallback=true (explicit opt-in only)
//   * Optional env override: SUPABASE_ALLOW_GLOBAL_TENANT_FALLBACK=true

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Legacy fallback tenant id (deprecated; only used when explicitly allowed)
const GLOBAL_TENANT_ID = process.env.SUPABASE_GLOBAL_TENANT_ID ?? "global";

// Explicit opt-in env escape hatch (defaults to false)
const ALLOW_GLOBAL_TENANT_FALLBACK =
  String(process.env.SUPABASE_ALLOW_GLOBAL_TENANT_FALLBACK ?? "false").toLowerCase() === "true";

if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false },
      })
    : null;

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function resolveTenantKeyStrict(tenantId: string | null | undefined, allowGlobalFallback?: boolean): string {
  const t = (tenantId ?? "").trim();

  if (t && isUuid(t)) return t;

  // Only allow the legacy fallback when EXPLICITLY opted-in
  if (allowGlobalFallback === true || ALLOW_GLOBAL_TENANT_FALLBACK) {
    if (GLOBAL_TENANT_ID && isUuid(GLOBAL_TENANT_ID)) return GLOBAL_TENANT_ID;
    // If global is not UUID, still allow as last resort for legacy schemas that use text tenant keys.
    // Prefer migrating those schemas to UUID.
    return GLOBAL_TENANT_ID || "global";
  }

  throw new Error("missing_tenant_id_for_ingestion_insert");
}

/**
 * saveIngestion - creates a product_ingestions row.
 *
 * IMPORTANT:
 * - tenantId is now REQUIRED by default (strict), because downstream Import/connectors need it.
 * - If you are doing a controlled maintenance operation and truly need a fallback,
 *   pass allowGlobalFallback=true or set SUPABASE_ALLOW_GLOBAL_TENANT_FALLBACK=true.
 */
export async function saveIngestion({
  tenantId,
  type = "describe",
  status = "success",
  normalizedPayload,
  rawPayload,
  userId,
  sourceUrl,
  allowGlobalFallback = false,
}: {
  tenantId: string | null;
  type?: string;
  status?: "success" | "failed";
  normalizedPayload?: any;
  rawPayload?: any;
  userId?: string | null;
  sourceUrl?: string | null;
  allowGlobalFallback?: boolean;
}) {
  if (!url || !serviceKey || !supabase) return { id: null };

  const tenantKey = resolveTenantKeyStrict(tenantId, allowGlobalFallback);

  const payload: Record<string, any> = {
    tenant_id: tenantKey,
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
  const { data, error } = await supabase.from("product_ingestions").insert([payload]).select("id").limit(1).maybeSingle();

  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

/**
 * incrementUsageCounter
 *
 * Notes:
 * - usage_counters may be keyed by tenant_id text in some schemas.
 * - We keep the legacy fallback option here to avoid breaking older deployments,
 *   but you should pass tenantId whenever possible.
 */
export async function incrementUsageCounter({
  tenantId,
  metric = "describe_calls",
  incrementBy = 1,
  allowGlobalFallback = true,
}: {
  tenantId: string | null;
  metric?: string;
  incrementBy?: number;
  allowGlobalFallback?: boolean;
}) {
  if (!url || !serviceKey || !supabase) return null;

  const now = new Date().toISOString();
  const tenantKey = resolveTenantKeyStrict(tenantId, allowGlobalFallback);

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

    if (existing && typeof (existing as any).count !== "undefined") {
      const newCount = Number((existing as any).count ?? 0) + Number(incrementBy);
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
 * - Defaults to allowGlobalFallback=true for backwards compatibility,
 *   but callers should pass tenantId for correct multi-tenant enforcement.
 */
export async function checkQuota({
  tenantId,
  metric = "describe_calls",
  limit = Infinity,
  allowGlobalFallback = true,
}: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
  allowGlobalFallback?: boolean;
}) {
  if (!url || !serviceKey || !supabase) return true;

  const tenantKey = resolveTenantKeyStrict(tenantId, allowGlobalFallback);

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

    const current = Number((data as any)?.count ?? 0);
    return current < limit;
  } catch (err) {
    console.error("checkQuota unexpected error:", err);
    // Fail-open to avoid blocking when DB is unreachable; change if you prefer fail-closed
    return true;
  }
}
