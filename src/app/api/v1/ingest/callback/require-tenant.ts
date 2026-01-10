// src/app/api/v1/ingest/callback/require-tenant.ts
// Helper to require/derive tenantId for ingestion creation.
// Use this in your ingestion creation route so new product_ingestions always get tenant_id/org_id set.

export function extractTenantFromPipelinePayload(payload: any): string | null {
  if (!payload) return null;
  return payload.tenantId ?? payload.orgId ?? null;
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
  const tenantFromBody = requestBody?.tenantId ?? requestBody?.orgId ?? null;
  if (tenantFromBody) return String(tenantFromBody);

  const tenantFromPipeline = extractTenantFromPipelinePayload(pipelinePayload);
  if (tenantFromPipeline) return String(tenantFromPipeline);

  const tenantFromAuth = authContext?.tenantId ?? authContext?.orgId ?? null;
  if (tenantFromAuth) return String(tenantFromAuth);

  // No tenant found - fail early so DB never receives null tenant_id
  throw new Error("missing_tenant_id_for_ingestion");
}

/*
Example usage (pseudo-code) in your ingestion callback route:

import { requireTenantId } from './require-tenant';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const body = await req.json();
    const pipelinePayload = body?.pipelinePayload ?? null;
    const authContext = { tenantId: req.user?.tenantId }; // adapt to your auth

    const tenantId = requireTenantId({ requestBody: body, pipelinePayload, authContext });

    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const row = {
      id: body?.ingestionId ?? genUuid(),
      tenant_id: tenantId,
      org_id: tenantId,
      normalized_payload: body?.normalized_payload ?? body,
      ingest_callback_at: new Date().toISOString(),
      // ...other fields...
    };
    await supa.from('product_ingestions').insert([row]);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status: 422 });
  }
}
*/
