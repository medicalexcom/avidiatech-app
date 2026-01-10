// src/app/api/v1/ingest/callback/require-tenant.ts
// Helper to require/derive tenantId for ingestion creation.
//
// Usage: call requireTenantId(...) from your ingestion creation route handler
// to ensure tenant_id/org_id are always present when inserting product_ingestions.

export function extractTenantFromPipelinePayload(payload: any): string | null {
  if (!payload) return null;
  // support both camelCase and snake_case-ish forms
  return payload.tenantId ?? payload.orgId ?? payload.tenant_id ?? payload.org_id ?? null;
}

/**
 * Determine and return a tenant UUID string for ingestion creation.
 * Order of precedence:
 *  1) requestBody.tenantId / requestBody.orgId
 *  2) pipelinePayload.tenantId / pipelinePayload.orgId
 *  3) authContext.tenantId / authContext.orgId (if you attach tenant to authenticated user)
 *
 * Throws Error('missing_tenant_id_for_ingestion') if none found.
 */
export function requireTenantId({
  requestBody,
  pipelinePayload,
  authContext,
}: {
  requestBody?: any;
  pipelinePayload?: any;
  authContext?: any;
}): string {
  const tenantFromBody = requestBody?.tenantId ?? requestBody?.orgId ?? requestBody?.tenant_id ?? requestBody?.org_id ?? null;
  if (tenantFromBody) return String(tenantFromBody);

  const tenantFromPipeline = extractTenantFromPipelinePayload(pipelinePayload);
  if (tenantFromPipeline) return String(tenantFromPipeline);

  const tenantFromAuth = authContext?.tenantId ?? authContext?.orgId ?? authContext?.tenant_id ?? authContext?.org_id ?? null;
  if (tenantFromAuth) return String(tenantFromAuth);

  // No tenant found - fail early so DB never receives null tenant_id
  throw new Error("missing_tenant_id_for_ingestion");
}
