import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIntegration } from "@/lib/integrations/service";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";
import processConnectorSync from "@/lib/imports/connectorSync";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST: kick off a connector sync for an integration id.
 * Requires an authenticated session and admin/owner membership in the org.
 */
export async function POST(req: Request, context: any) {
  try {
    // 1. Require authenticated Clerk session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

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

    // 2. Verify the caller is an admin/owner of the org before allowing sync
    const admin = await isOrgAdmin(req, orgId);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Fetch integration
    const integration = await getIntegration(integrationId);
    if (!integration) {
      return NextResponse.json({ ok: false, error: "integration not found" }, { status: 404 });
    }

    // Create import_job
    const { data: jobRow, error: insertErr } = await getServerSupabase()
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
      await processConnectorSync(String(jobRow.id), integration);
      return NextResponse.json({ ok: true, jobId: jobRow.id });
    } catch (procErr: any) {
      await getServerSupabase()
        .from("import_jobs")
        .update({ status: "failed", errors: JSON.stringify([String(procErr?.message || procErr)]) })
        .eq("id", jobRow.id);
      return NextResponse.json({ ok: false, error: String(procErr?.message || procErr) }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
