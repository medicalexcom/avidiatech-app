import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";
import { createWatchForIngestion } from "@/lib/monitor/hooks";
import { resolveTenantForInsert } from "@/lib/tenancy/resolveTenantForInsert";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = process.env.UPLOAD_BUCKET || "imports";

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any) as any;
    if (!userId) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const canonicalUrlFromForm = (form.get("canonical_url") as string | null) ?? null;

    if (!file) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // Resolve tenant strictly — uploads create ingestion rows used by import
    const tenantId = await resolveTenantForInsert({ req, strict: true });

    // Upload the file into Supabase storage
    const originalName = file.name || "upload.bin";
    const buffer = Buffer.from(await file.arrayBuffer());

    const pathRelative = `${randomUUID()}-${originalName}`.replace(/\s+/g, "_");
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .upload(pathRelative, buffer, { contentType: file.type ?? undefined, upsert: false });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ ok: false, error: uploadError.message ?? String(uploadError) }, { status: 500 });
    }

    // Determine canonical full path and normalized relative path
    const rawPath =
      (uploadData && ((uploadData as any).path || (uploadData as any).fullPath || (uploadData as any).Key)) ??
      pathRelative;
    const relativePath = String(rawPath).replace(new RegExp(`^${BUCKET}\\/`), "").replace(/^\/+/, "");
    const canonicalFilePath = `${BUCKET}/${relativePath}`;

    // Prepare ingestion row payload (STRICT tenant)
    const payload: Record<string, any> = {
      tenant_id: tenantId,
      file_path: canonicalFilePath,
      file_name: originalName,
      file_format: originalName.split(".").pop() ?? null,
      mapping: null,
      platform: null,
      status: "created",
      uploaded_by: userId,
      created_at: new Date().toISOString(),
    };

    // Insert into product_ingestions
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("product_ingestions")
      .insert([payload])
      .select("*")
      .maybeSingle();

    if (insertError || !inserted) {
      console.warn("Insert into product_ingestions failed:", insertError);
      return NextResponse.json(
        {
          ok: false,
          error: "db_insert_failed",
          detail: insertError?.message ?? String(insertError ?? "unknown"),
        },
        { status: 500 }
      );
    }

    // Determine jobId from inserted row
    let jobId: string | null = (inserted as any).id ?? (inserted as any).job_id ?? null;
    if (jobId !== null && typeof jobId !== "string") jobId = String(jobId);
    if (!jobId) jobId = randomUUID();

    // Best-effort: create monitor watch (async, non-blocking)
    (async () => {
      try {
        const sourceUrl = canonicalUrlFromForm ?? `supabase://${canonicalFilePath}`;
        await createWatchForIngestion({
          source_url: sourceUrl,
          product_id: (inserted as any)?.id ?? null,
          tenant_id: tenantId,
          created_by: userId,
          frequency_seconds: null,
        });
      } catch (err: any) {
        console.warn("createWatchForIngestion failed:", err?.message ?? err);
      }
    })();

    return NextResponse.json(
      {
        ok: true,
        jobId,
        file_path: canonicalFilePath,
        file_name: originalName,
        file_format: payload.file_format,
        inserted,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg = String(err?.message ?? err);

    // Important: strict tenancy failures should be explicit
    if (msg === "missing_tenant_id_for_insert") {
      return NextResponse.json({ ok: false, error: "missing_tenant", detail: msg }, { status: 422 });
    }

    console.error("upload-to-supabase route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}
