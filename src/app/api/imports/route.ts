import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseFileBuffer } from "@/lib/imports/parseFile";
import { z } from "zod";
import type { NextRequest } from "next/server";

// Server-side Supabase client with service role key
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/*
POST /api/imports
Body: { file_path, file_name, file_format, mapping?, dedupeKey? }
Requires auth: verify user & organization server-side (pseudo shown)
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      file_path: z.string(),
      file_name: z.string().optional(),
      file_format: z.enum(["csv", "xlsx"]).optional(),
      mapping: z.any().optional(),
      dedupeKey: z.string().optional(),
      org_id: z.string().uuid().optional(), // server should validate from session
    });
    const data = schema.parse(body);

    // TODO: verify session & org ownership using Clerk server SDK
    // const { userId, orgId } = await verifyClerkSession(req);

    const orgId = data.org_id; // replace with verified org id from session
    const createdBy = "server-user-id-placeholder"; // replace with verified user id

    // create import job
    const { data: jobRow } = await supaAdmin
      .from("import_jobs")
      .insert({
        org_id: orgId,
        created_by: createdBy,
        file_path: data.file_path,
        file_name: data.file_name ?? null,
        file_format: data.file_format ?? null,
        status: "processing",
        meta: { mapping: data.mapping ?? null, dedupeKey: data.dedupeKey ?? null },
      })
      .select("*")
      .single();

    // download file from storage
    const [bucket, ...rest] = data.file_path.split("/", 1);
    // supabase storage uses bucket name and path; client API: supaAdmin.storage.from(bucket).download(path)
    // Let's parse bucket and path correctly
    const firstSep = data.file_path.indexOf("/");
    const bucketName = firstSep === -1 ? data.file_path : data.file_path.slice(0, firstSep);
    const filePathInBucket = firstSep === -1 ? "" : data.file_path.slice(firstSep + 1);

    const download = await supaAdmin.storage.from(bucketName).download(filePathInBucket);
    if (download.error || !download.data) {
      // update job as failed
      await supaAdmin
        .from("import_jobs")
        .update({ status: "failed", errors: JSON.stringify([download.error?.message ?? "download_failed"]) })
        .eq("id", jobRow.id);
      return NextResponse.json({ ok: false, error: "download_failed" }, { status: 500 });
    }
    const arrayBuffer = await download.data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // parse file into rows (sheetjs / papaparse abstraction)
    const { rows, headers } = await parseFileBuffer(buffer, data.file_format);

    // enforce limits
    if (rows.length > 5000) {
      await supaAdmin.from("import_jobs").update({
        status: "failed",
        errors: JSON.stringify(["row_limit_exceeded"]),
      }).eq("id", jobRow.id);
      return NextResponse.json({ ok: false, error: "row_limit_exceeded" }, { status: 400 });
    }
    if ((headers?.length ?? 0) > 50) {
      await supaAdmin.from("import_jobs").update({
        status: "failed",
        errors: JSON.stringify(["column_limit_exceeded"]),
      }).eq("id", jobRow.id);
      return NextResponse.json({ ok: false, error: "column_limit_exceeded" }, { status: 400 });
    }

    // simple validation + insert to import_rows and optionally to product table
    let successes = 0;
    let failures = 0;
    const rowInserts = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // TODO: apply mapping, validate required fields, types, dedupe detection.
      // For MVP we'll accept rows and mark success
      rowInserts.push({
        job_id: jobRow.id,
        row_number: i + 1,
        data: r,
        status: "success",
      });
      successes++;
    }

    if (rowInserts.length > 0) {
      // chunk inserts if needed
      const chunkSize = 500;
      for (let i = 0; i < rowInserts.length; i += chunkSize) {
        const chunk = rowInserts.slice(i, i + chunkSize);
        await supaAdmin.from("import_rows").insert(chunk);
      }
    }

    await supaAdmin.from("import_jobs").update({
      total_rows: rows.length,
      processed_rows: successes,
      status: "complete",
      result_summary: { successes, failures },
    }).eq("id", jobRow.id);

    return NextResponse.json({ ok: true, jobId: jobRow.id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
