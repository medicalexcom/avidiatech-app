import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { getQueue } from "@/lib/queue/bull";
import { validateImportFile } from "@/lib/imports/validateImportFile";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_path: filePath, file_name: fileName, file_format: fileFormat, mapping = null, platform = null, bucket = undefined } = body;

    if (!filePath || !fileName) return NextResponse.json({ ok: false, error: "file_path and file_name required" }, { status: 400 });

    // Server-side validation
    const validation = await validateImportFile({ bucket, filePath });
    if (!validation.ok) {
      const status = validation.errorCode === "file_too_large" ? 413 : 400;
      return NextResponse.json({ ok: false, error: validation.message, code: validation.errorCode, rows: validation.rows, cols: validation.cols }, { status });
    }

    const { data: jobRow, error } = await supaAdmin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        status: "queued",
        source_type: "file",
        file_path: filePath,
        file_name: fileName,
        file_format: fileFormat,
        meta: { mapping, platform, validation: { rows: validation.rows, cols: validation.cols, fileSizeBytes: (validation as any).fileSizeBytes } },
      })
      .select("*")
      .single();

    if (error) throw error;

    const queue = getQueue("import-process");
    await queue.add("import-process", { jobId: jobRow.id }, { attempts: 3 });

    return NextResponse.json({ ok: true, jobId: jobRow.id });
  } catch (err: any) {
    console.error("POST /api/imports error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
