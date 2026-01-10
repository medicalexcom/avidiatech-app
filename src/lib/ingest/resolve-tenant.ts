// src/lib/ingest/resolve-tenant.ts
// Helper to resolve tenant for ingestion creation (start from existing require-tenant helper).
// Behavior:
// 1) Try request body (tenantId, orgId, tenant_id, org_id).
// 2) Try pipelinePayload fields (tenantId / orgId variants).
// 3) Try authContext (tenant attached to the user/session).
// 4) If still missing, use environment variable DEFAULT_FALLBACK_TENANT_ID (if set).
// 5) If still missing, return null (caller decides to reject or accept for backfill).
//
// Note: Do NOT hard-code fallback UUIDs here. Use the environment variable to choose an appropriate tenant
// for the running environment (dev vs staging vs prod).

import { requireTenantId } from "@/app/api/v1/ingest/callback/require-tenant";
import { createClient } from "@supabase/supabase-js";

export type ResolveTenantOpts = {
  requestBody?: any;
  pipelinePayload?: any;
  authContext?: any;
  strict?: boolean; // if true, throw when tenant cannot be determined even after fallback
};

/**
 * Returns tenantId string or null.
 * If strict=true and tenant cannot be determined, throws Error('missing_tenant_id_for_ingestion')
 */
export async function resolveTenantForInsert(opts: ResolveTenantOpts): Promise<string | null> {
  const { requestBody, pipelinePayload, authContext, strict } = opts;

  // Use requireTenantId in non-strict mode first (it checks body/pipeline/auth)
  const tenantFromInputs = requireTenantId(
    { requestBody, pipelinePayload, authContext },
    { strict: false }
  );

  if (tenantFromInputs) return tenantFromInputs;

  // Next, check optional fallback env var (configured per-environment)
  const fallback = process.env.DEFAULT_FALLBACK_TENANT_ID ?? process.env.FALLBACK_TENANT_ID ?? null;
  if (fallback) return String(fallback);

  if (strict) {
    throw new Error("missing_tenant_id_for_ingestion");
  }

  return null;
}

/**
 * Utility to validate that a UUID-like string exists in tenants table.
 * Optional: used to verify fallback is a valid tenant in DB.
 */
export async function validateTenantExists(supabaseUrl: string, supabaseKey: string, tenantId: string) {
  if (!supabaseUrl || !supabaseKey) return false;
  const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  try {
    const { data, error } = await supa.from("tenants").select("id").eq("id", tenantId).limit(1).maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
