// src/app/api/v1/ingest/create/route.example.ts
// Example ingestion-creation route which uses resolveTenantForInsert to ensure tenant_id is set.
// This is an example you can drop in or adapt into your existing creation endpoints (bulk, UI).
//
// Important: do not expose DEFAULT_FALLBACK_TENANT_ID in production unless you intend to
// assign all missing ingestions to that tenant. For dev/single-user environments it's convenient.
//
// Usage: POST { ingestionId?, normalized_payload?, pipelinePayload?, ... }
// The route will attempt to resolve tenant and insert product_ingestions.

import { createClient } from "@supabase/supabase-js";
import { resolveTenantForInsert } from "@/lib/ingest/resolve-tenant";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  const supa = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  try {
    const body = await request.json();

    // adapt authContext to your app (example: clerk)
    const authContext = { tenantId: (request as any).user?.tenantId ?? null };

    // Try to get tenant. Non-strict: will return null if not resolvable and no fallback set.
    const tenantId = await resolveTenantForInsert({
      requestBody: body,
      pipelinePayload: body?.pipelinePayload ?? null,
      authContext,
      strict: false,
    });

    // If tenantId is null and DB still has NOT NULL constraint, insertion will fail.
    // Optionally enforce strict here:
    // if (!tenantId) throw new Error("missing_tenant_id_for_ingestion");

    const ingestionRow: any = {
      id: body?.ingestionId ?? undefined,
      tenant_id: tenantId,
      org_id: tenantId ?? undefined,
      normalized_payload: body?.normalized_payload ?? body?.payload ?? body,
      ingest_callback_at: new Date().toISOString(),
      meta: body?.meta ?? null,
    };

    const { error } = await supa.from("product_ingestions").insert([ingestionRow]);

    if (error) {
      console.error("create ingestion failed", error);
      return new Response(JSON.stringify({ error: "db_insert_failed", detail: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "missing_tenant_id_for_ingestion") {
      return new Response(JSON.stringify({ error: msg }), { status: 422 });
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
