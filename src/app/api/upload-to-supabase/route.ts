import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { createWatchForIngestion } from "@/lib/monitor/hooks";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.UPLOAD_BUCKET ?? "imports";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = file.name ?? `file-${Date.now()}`;
    const safeName = originalName.replace(/\s+/g, "_");
    const pathRelative = `${Date.now()}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(pathRelative, buffer, { contentType: file.type ?? undefined, upsert: false });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message ?? String(uploadError) }, { status: 500 });
    }

    const rawPath = (uploadData && ((uploadData as any).path || (uploadData as any).fullPath)) ?? pathRelative;
    const relativePath = String(rawPath).replace(new RegExp(`^${BUCKET}\\/`), "").replace(/^\/+/, "");
    const canonicalFilePath = `${BUCKET}/${relativePath}`;

    // Build ingestion payload
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

    // Try to insert ingestion row
    let insertedRow: any = null;
    try {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("product_ingestions")
        .insert([payload])
        .select("*")
        .maybeSingle();

      if (insertError) {
        console.warn("Insert into product_ingestions failed:", insertError);
      } else {
        insertedRow = inserted;
      }
    } catch (err: any) {
      console.warn("Unexpected insert error:", err);
    }

    // Determine jobId
    let jobId: string | null = null;
    if (insertedRow) {
      jobId = insertedRow.id ?? insertedRow.job_id ?? null;
      if (jobId && typeof jobId !== "string") jobId = String(jobId);
    }
    if (!jobId) jobId = randomUUID();

    // Best-effort: create a monitor watch for this uploaded file
    (async () => {
      try {
        const sourceUrl = `supabase://${canonicalFilePath}`; // placeholder; replace with canonical URL if available
        await createWatchForIngestion({
          source_url: sourceUrl,
          product_id: insertedRow?.id ?? null,
          created_by: userId,
        });
        console.log("Created monitor watch for upload", sourceUrl);
      } catch (err: any) {
        console.warn("createWatchForIngestion failed:", err?.message ?? err);
      }
    })();

    return NextResponse.json({
      ok: true,
      jobId,
      file_path: canonicalFilePath,
      file_name: originalName,
      file_format: payload.file_format,
      rawUpload: uploadData,
      inserted: insertedRow ?? null,
    }, { status: 200 });
  } catch (err: any) {
    console.error("upload-to-supabase route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
