// src/lib/supabaseServer.ts
// Central Supabase server helper used across ingestion/import flows.
//
// saveIngestion now tolerantly retries if PostgREST reports missing columns
// (e.g. different environments with slightly different schema migrations).
// Long-term: prefer to run the DB migration to add missing columns.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Fallback tenant id used ONLY when explicitly configured in env (dev convenience).
const GLOBAL_TENANT_ID = process.env.SUPABASE_GLOBAL_TENANT_ID ?? null;

if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = (url && serviceKey)
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

/**
 * Parse missing column name from PostgREST schema-cache error message.
 * Example message:
 * "Could not find the 'raw_payload' column of 'product_ingestions' in the schema cache"
 */
function parseMissingColumnFromError(err: any): string | null {
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/Could not find the '([^']+)' column/);
  if (m && m[1]) return m[1];
  // also support generic patterns
  const m2 = msg.match(/column "(.*?)" does not exist/i);
  if (m2 && m2[1]) return m2[1];
  return null;
}

/**
 * saveIngestion - insertion helper that enforces tenant presence (unless global fallback configured)
 * and tolerantly strips unknown columns reported by PostgREST on insert.
 */
export async function saveIngestion({
  tenantId,
  type = "describe",
  // Allow 'pending' to reflect pre-engine state
  status = "success",
  normalizedPayload,
  rawPayload,
  userId,
  sourceUrl,
}: {
  tenantId: string | null;
  type?: string;
  status?: "success" | "failed" | "pending";
  normalizedPayload?: any;
  rawPayload?: any;
  userId?: string | null;
  sourceUrl?: string | null;
}) {
  if (!url || !serviceKey || !supabase) return { id: null };

  const effectiveTenant = tenantId ?? GLOBAL_TENANT_ID ?? null;
  if (!effectiveTenant) {
    const err = new Error("missing_tenant_id_for_ingestion");
    console.error("saveIngestion blocked: missing tenant and no GLOBAL_TENANT_ID configured");
    throw err;
  }

  // Build a conservative payload using snake_case column names that are expected in DB.
  const basePayload: Record<string, any> = {
    tenant_id: effectiveTenant,
    user_id: userId ?? null,
    export_type: type,
    status,
    normalized_payload: normalizedPayload ?? null,
    // raw_payload may not exist in all environments
    raw_payload: rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    basePayload.source_url = sourceUrl;
  }

  // Attempt insert. If DB complains about missing column(s), remove them and retry.
  const payload = { ...basePayload };
  const maxRetries = 5;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const { data, error } = await supabase
        .from("product_ingestions")
        .insert([payload])
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error) {
        // If PostgREST reports a missing column, we'll attempt to remove that field and retry.
        const missingColumn = parseMissingColumnFromError(error);
        if (missingColumn && attempt <= maxRetries) {
          console.warn(`saveIngestion: postgrest missing column '${missingColumn}' - removing and retrying (attempt ${attempt})`);
          // Remove matching key(s) from payload. Try exact key and camelCase variants.
          delete payload[missingColumn];
          // also try alternate keys (camelCase)
          const camel = missingColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          delete payload[camel];
          // continue to retry
          continue;
        }

        // For other errors, throw
        console.error("saveIngestion error from supabase:", error);
        throw error;
      }

      // success
      return data;
    } catch (e: any) {
      // If we parsed missing column earlier but supabase threw something else, check string message for column and retry
      const missingColumn = parseMissingColumnFromError(e);
      if (missingColumn && attempt <= maxRetries) {
        console.warn(`saveIngestion caught missing column '${missingColumn}' in exception - removing and retrying (attempt ${attempt})`);
        delete payload[missingColumn];
        const camel = missingColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        delete payload[camel];
        continue;
      }
      // Not a missing-column scenario or retries exhausted
      throw e;
    }
  }
}

/* ---- Other helpers unchanged ---- */

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

export async function checkQuota(opts: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
}): Promise<boolean> {
  const { tenantId, metric = "describe_calls", limit = Infinity } = opts;

  if (!isFinite(limit)) return true;
  if (!url || !serviceKey || !supabase) {
    return true;
  }

  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;
  if (!tenantKey) return true;

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
