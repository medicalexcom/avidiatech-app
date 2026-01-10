// src/app/api/v1/ingest/create/route.example.ts
// Example ingestion-creation route that enforces tenant presence (strict).
// Adapt this logic into your real endpoints (bulk worker, UI). This example uses resolveTenantForInsert
// and will return 422 if tenant cannot be determined (no fallback configured).

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

    // Enforce tenant presence: strict=true will throw if tenant cannot be determined.
    const tenantId = await resolveTenantForInsert({
      requestBody: body,
      pipelinePayload: body?.pipelinePayload ?? null,
      authContext,
      strict: true, // enforce at API layer
    });

    // Now tenantId must be present (otherwise resolveTenantForInsert would have thrown)
    const ingestionRow: any = {
      id: body?.ingestionId ?? undefined,
      tenant_id: tenantId,
      org_id: tenantId,
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
