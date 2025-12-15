import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// relative imports (no "@/..." alias)
import { getOrgFromRequest } from "../../../../../../lib/auth/getOrgFromRequest";
import { getQueue } from "../../../../../../lib/queue/bull";

/**
 * POST /api/v1/integrations/:id/sync
 *
 * - Verifies org from session.
 * - Ensures the integration belongs to the org.
 * - Creates an import_jobs row with status 'queued' and enqueues a 'connector-sync' job.
 *
 * Response: { ok: true, jobId }
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    // normalize params (context.params may be a Promise in some next versions)
    let params = context?.params;
    if (params && typeof params.then === "function") params = await params;
    const integrationId = params?.id;
    if (!integrationId) return NextResponse.json({ ok: false, error: "integration id required" }, { status: 400 });

    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated / org not found" }, { status: 401 });

    // verify integration belongs to org
    const { data: integration, error: intErr } = await supaAdmin.from("integrations").select("*").eq("id", integrationId).single();
    if (intErr) throw intErr;
    if (!integration || integration.org_id !== orgId) {
      return NextResponse.json({ ok: false, error: "Integration not found or access denied" }, { status: 404 });
    }

    // create import_job (queued)
    const { data: jobRow, error: insertErr } = await supaAdmin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        status: "queued",
        source_type: "connector",
        connector_id: integrationId,
        meta: { provider: integration.provider },
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    // enqueue connector-sync job
    const queue = getQueue("connector-sync");
    await queue.add("connector-sync", { integrationId, jobId: jobRow.id }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });

    return NextResponse.json({ ok: true, jobId: jobRow.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
