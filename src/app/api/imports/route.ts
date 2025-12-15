import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "../../../lib/auth/getOrgFromRequest";
import { getQueue } from "../../../lib/queue/bull";

/**
 * POST /api/imports
 * - Creates an import_jobs row with status 'queued'.
 * - Enqueues an 'import-process' job for background worker.
 * - Validates presence of file_path and file_name.
 *
 * Server derives org from session via getOrgFromRequest.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated / org not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_path, file_name, file_format, mapping = null, platform = null } = body;

    if (!file_path || !file_name) return NextResponse.json({ ok: false, error: "file_path and file_name required" }, { status: 400 });

    // insert import_jobs row with status queued
    const { data: jobRow, error } = await supaAdmin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        status: "queued",
        source_type: "file",
        file_path,
        file_name,
        file_format,
        meta: { mapping, platform },
      })
      .select("*")
      .single();

    if (error) throw error;

    // enqueue import-process job
    const queue = getQueue("import-process");
    await queue.add("import-process", { jobId: jobRow.id }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });

    return NextResponse.json({ ok: true, jobId: jobRow.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
