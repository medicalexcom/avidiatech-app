// src/lib/ingest/resolve-tenant.ts
// Helper to resolve tenant for ingestion creation.
//
// Resolution order:
// 1) requestBody (tenantId, orgId, tenant_id, org_id)
// 2) pipelinePayload (tenantId variants)
// 3) authContext (tenantId/orgId)
// 4) DEFAULT_FALLBACK_TENANT_ID or FALLBACK_TENANT_ID env (optional, env-configured fallback)
// If strict=true and no tenant found, throws Error('missing_tenant_id_for_ingestion').

import { createClient } from "@supabase/supabase-js";
import { requireTenantId } from "@/app/api/v1/ingest/callback/require-tenant";

export type ResolveTenantOpts = {
  requestBody?: any;
  pipelinePayload?: any;
  authContext?: any;
  strict?: boolean; // if true, throw when tenant cannot be determined even after fallback
};

export async function resolveTenantForInsert(opts: ResolveTenantOpts): Promise<string | null> {
  const { requestBody, pipelinePayload, authContext, strict } = opts ?? {};

  // First attempt: use the requireTenantId helper in non-strict mode (checks body/pipeline/auth)
  const tenantFromInputs = requireTenantId(
    { requestBody, pipelinePayload, authContext },
    { strict: false }
  );
  if (tenantFromInputs) return String(tenantFromInputs);

  // Next: check configured fallback environment variables (explicit opt-in)
  const fallback = process.env.DEFAULT_FALLBACK_TENANT_ID ?? process.env.FALLBACK_TENANT_ID ?? null;
  if (fallback) {
    // Optionally validate the fallback exists in DB when running in CI/prod to avoid silent misconfig.
    // We keep this lightweight: only validate in presence of SUPABASE config.
    const validated = await validateTenantExists(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", String(fallback));
    if (validated) return String(fallback);
    // If validation failed, do not silently return fallback; fall through and error if strict.
  }

  if (strict) {
    throw new Error("missing_tenant_id_for_ingestion");
  }

  return null;
}

/**
 * validateTenantExists
 * - returns true when the tenant id exists in tenants table (best-effort).
 * - returns false if validation cannot be performed or tenant not found.
 */
export async function validateTenantExists(supabaseUrl: string, supabaseKey: string, tenantId: string) {
  if (!supabaseUrl || !supabaseKey || !tenantId) return false;
  try {
    const supa = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data, error } = await supa.from("tenants").select("id").eq("id", tenantId).limit(1).maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
