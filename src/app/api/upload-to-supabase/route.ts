import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.UPLOAD_BUCKET ?? "imports";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * POST /api/upload-to-supabase
 * Expects multipart/form-data with "file"
 * Returns JSON: { ok: true, jobId, file_path, file_name, file_format, warning? }
 */
export async function POST(req: Request) {
  try {
    // Clerk authentication (server-side). Pass req so Clerk reads cookies/headers.
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build safe path (timestamp + sanitized)
    const originalName = file.name ?? `file-${Date.now()}`;
    const safeName = originalName.replace(/\s+/g, "_");
    const pathRelative = `${Date.now()}-${safeName}`; // relative to bucket

    // Upload to Supabase Storage using service role
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(pathRelative, buffer, { contentType: file.type ?? undefined, upsert: false });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message ?? String(uploadError) }, { status: 500 });
    }

    // Determine canonical full path and normalized relative path
    // Supabase sometimes returns data.path or data.fullPath — normalize.
    const rawPath =
      (uploadData && (uploadData.path || (uploadData as any).fullPath || (uploadData as any).Key || uploadData)) ??
      pathRelative;
    // Ensure relative path (strip any leading "imports/" if present)
    const relativePath = String(rawPath).replace(new RegExp(`^${BUCKET}\\/`), "").replace(/^\/+/, "");
    const canonicalFilePath = `${BUCKET}/${relativePath}`;

    // Prepare ingestion row payload
    const payload = {
      file_path: canonicalFilePath,
      file_name: originalName,
      file_format: originalName.split(".").pop() ?? null,
      mapping: null,
      platform: null,
      status: "created",
      uploaded_by: userId,
      created_at: new Date().toISOString(),
    };

    // Try insert into product_ingestions (service role bypasses RLS)
    try {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("product_ingestions")
        .insert([payload])
        .select("*")
        .maybeSingle();

      if (insertError) {
        // If table missing or insert failed, return synthetic jobId but include warning
        console.warn("Insert into product_ingestions failed:", insertError);
        const syntheticId = randomUUID();
        return NextResponse.json(
          {
            ok: true,
            warning: "Could not create DB row; returning synthetic jobId. Please check product_ingestions table/permissions.",
            jobId: syntheticId,
            file_path: canonicalFilePath,
            file_name: originalName,
            file_format: payload.file_format,
            rawUpload: uploadData,
            dbError: insertError.message ?? insertError,
          },
          { status: 200 }
        );
      }

      // Determine jobId from inserted row (common id field: id)
      let jobId: string | null = null;
      if (inserted) {
        jobId = (inserted as any).id ?? (inserted as any).job_id ?? null;
        if (jobId !== null && typeof jobId !== "string") jobId = String(jobId);
      }
      // Fallback: if no id returned, generate a UUID
      if (!jobId) jobId = randomUUID();

      return NextResponse.json(
        {
          ok: true,
          jobId,
          file_path: canonicalFilePath,
          file_name: originalName,
          file_format: payload.file_format,
          rawUpload: uploadData,
        },
        { status: 200 }
      );
    } catch (errInsert: any) {
      console.error("Unexpected insert error:", errInsert);
      const syntheticId = randomUUID();
      return NextResponse.json(
        {
          ok: true,
          warning: "Unexpected DB error while creating ingestion; returning synthetic jobId.",
          jobId: syntheticId,
          file_path: canonicalFilePath,
          file_name: originalName,
          file_format: payload.file_format,
          dbError: String(errInsert?.message ?? errInsert),
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("upload-to-supabase route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
