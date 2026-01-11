// src/lib/ingest/resolve-tenant.ts
// Helper to resolve tenant for ingestion creation. Self-contained (does not import from app routes)
// to avoid cross-module import resolution issues during build.
//
// Resolution order:
// 1) requestBody (tenantId, orgId, tenant_id, org_id)
// 2) pipelinePayload (tenantId variants)
// 3) authContext (tenantId/orgId)
// 4) DEFAULT_FALLBACK_TENANT_ID or FALLBACK_TENANT_ID env (optional, env-configured fallback)
// If strict=true and no tenant found, throws Error('missing_tenant_id_for_ingestion').

import { createClient } from "@supabase/supabase-js";

export type ResolveTenantOpts = {
  requestBody?: any;
  pipelinePayload?: any;
  authContext?: any;
  strict?: boolean; // if true, throw when tenant cannot be determined even after fallback
};

export type RequireTenantOpts = {
  strict?: boolean;
};

/**
 * requireTenantId
 * - Small, self-contained implementation copied from the previous route helper.
 * - Returns string tenant id or null. Throws when strict === true and nothing found.
 */
function requireTenantId(
  {
    requestBody,
    pipelinePayload,
    authContext,
  }: {
    requestBody?: any;
    pipelinePayload?: any;
    authContext?: any;
  },
  opts?: RequireTenantOpts
): string | null {
  const strict = Boolean(opts?.strict);

  const tenantFromBody =
    requestBody?.tenantId ??
    requestBody?.orgId ??
    requestBody?.tenant_id ??
    requestBody?.org_id ??
    null;
  if (tenantFromBody) return String(tenantFromBody);

  const tenantFromPipeline =
    pipelinePayload?.tenantId ??
    pipelinePayload?.orgId ??
    pipelinePayload?.tenant_id ??
    pipelinePayload?.org_id ??
    null;
  if (tenantFromPipeline) return String(tenantFromPipeline);

  const tenantFromAuth =
    authContext?.tenantId ??
    authContext?.orgId ??
    authContext?.tenant_id ??
    authContext?.org_id ??
    null;
  if (tenantFromAuth) return String(tenantFromAuth);

  if (strict) {
    throw new Error("missing_tenant_id_for_ingestion");
  }

  return null;
}

/**
 * resolveTenantForInsert
 * - Uses requireTenantId first (non-strict) then optional env fallback, and optionally validates fallback.
 * - If strict=true and tenant cannot be determined, throws Error('missing_tenant_id_for_ingestion')
 */
export async function resolveTenantForInsert(opts: ResolveTenantOpts): Promise<string | null> {
  const { requestBody, pipelinePayload, authContext, strict } = opts ?? {};

  // First attempt: use local requireTenantId in non-strict mode
  const tenantFromInputs = requireTenantId(
    { requestBody, pipelinePayload, authContext },
    { strict: false }
  );
  if (tenantFromInputs) return String(tenantFromInputs);

  // Next: check configured fallback environment variables (explicit opt-in)
  const fallback = process.env.DEFAULT_FALLBACK_TENANT_ID ?? process.env.FALLBACK_TENANT_ID ?? null;
  if (fallback) {
    // Optionally validate the fallback exists in DB when SUPABASE config is present.
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
