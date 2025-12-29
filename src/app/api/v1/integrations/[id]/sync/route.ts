import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations/service";
import { createClient } from "@supabase/supabase-js";
import processConnectorSync from "@/lib/imports/connectorSync";

/**
 * POST: kick off a connector sync for an integration id
 * - creates an import_jobs row scoped to the org, with source_type='connector' and connector_id set.
 * - immediately calls a server-side processing function (synchronous for MVP).
 *
 * Note: context.params may be a Promise in some Next typings — normalize it here.
 *
 * TODO: verify session & org membership instead of trusting body.org_id.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    // Normalize params (context.params can be a Promise in some Next versions)
    let params = context?.params;
    if (params && typeof params?.then === "function") {
      params = await params;
    }
    const integrationId = params?.id;
    if (!integrationId) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }

    // Parse body (expect org_id and optional created_by)
    const body = await req.json().catch(() => ({}));
    const orgId = body.org_id;
    const createdBy = body.created_by ?? null;
    if (!orgId) {
      return NextResponse.json({ ok: false, error: "org_id required" }, { status: 400 });
    }

    // Fetch integration
    const integration = await getIntegration(integrationId);
    if (!integration) {
      return NextResponse.json({ ok: false, error: "integration not found" }, { status: 404 });
    }

    // Create import_job
    const { data: jobRow, error: insertErr } = await supaAdmin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        created_by: createdBy,
        file_path: null,
        file_name: null,
        file_format: null,
        status: "processing",
        source_type: "connector",
        connector_id: integrationId,
        meta: { provider: integration.provider },
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    // Process sync (MVP: synchronous). In production use a background job queue.
    try {
      await processConnectorSync(supaAdmin, String(jobRow.id), integration);
      return NextResponse.json({ ok: true, jobId: jobRow.id });
    } catch (procErr: any) {
      await supaAdmin
        .from("import_jobs")
        .update({ status: "failed", errors: JSON.stringify([String(procErr?.message || procErr)]) })
        .eq("id", jobRow.id);
      return NextResponse.json({ ok: false, error: String(procErr?.message || procErr) }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
