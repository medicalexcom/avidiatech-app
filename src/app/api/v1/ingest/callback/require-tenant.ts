// src/app/api/v1/ingest/callback/require-tenant.ts
// Helper to require/derive tenantId for ingestion creation.
// Backwards-compatible: callers can pass { strict: true } to throw on missing tenant,
// or omit / pass strict: false to receive null when no tenant could be determined.

export function extractTenantFromPipelinePayload(payload: any): string | null {
  if (!payload) return null;
  // support multiple shapes
  return (
    payload.tenantId ??
    payload.orgId ??
    payload.tenant_id ??
    payload.org_id ??
    null
  );
}

export type RequireTenantOpts = {
  strict?: boolean; // default: false — return null instead of throwing
};

/**
 * Determine and return a tenant UUID string for ingestion creation.
 * Order of precedence:
 *  1) requestBody.tenantId / requestBody.orgId / requestBody.tenant_id / requestBody.org_id
 *  2) pipelinePayload.tenantId / pipelinePayload.orgId / pipelinePayload.tenant_id / pipelinePayload.org_id
 *  3) authContext.tenantId / authContext.orgId
 *
 * If opts.strict === true, throws Error('missing_tenant_id_for_ingestion') when none found.
 * Otherwise returns null when tenant cannot be determined.
 */
export function requireTenantId(
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

  const tenantFromPipeline = extractTenantFromPipelinePayload(pipelinePayload);
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

/*
Usage:
const tenantId = requireTenantId({ requestBody: body, pipelinePayload, authContext }, { strict: false });
if (tenantId === null) {
  // caller can choose to insert with null tenant (for later backfill) or reject (strict)
}
*/
