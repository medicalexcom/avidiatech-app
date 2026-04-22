import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET = process.env.UPLOAD_BUCKET ?? "imports";

/**
 * Normalize a provided file_path so it becomes the path relative to the bucket.
 * Accepts values like:
 * - "imports/1765-...xlsx"
 * - "/imports/1765-...xlsx"
 * - "1765-...xlsx"
 * - full storage URL: "https://<proj>.supabase.co/storage/v1/object/imports/1765-...xlsx"
 */
function normalizeToRelativePath(inputPath: string | undefined, bucket = BUCKET) {
  if (!inputPath) return undefined;

  // If it's a full Supabase storage URL, extract the path after /storage/v1/object/
  try {
    if (inputPath.startsWith("http://") || inputPath.startsWith("https://")) {
      const u = new URL(inputPath);
      const match = u.pathname.match(/\/storage\/v1\/object\/(.+)$/);
      if (match && match[1]) {
        inputPath = match[1];
      }
    }
  } catch (e) {
    // ignore URL parse errors and continue
  }

  // Remove any leading slashes
  inputPath = inputPath.replace(/^\/+/, "");

  // If it starts with the bucket, strip that prefix
  if (inputPath.startsWith(`${bucket}/`)) {
    inputPath = inputPath.slice(bucket.length + 1);
  }

  // Done: inputPath is now relative to the bucket
  return inputPath;
}

/**
 * Try to download the file from Supabase Storage using the admin client.
 * Returns an object { ok: boolean, attemptedUrl?: string, error?: string }
 */
async function verifyDownload(relativePath: string) {
  try {
    const { data: fileData, error: downloadError } = await getServerSupabase().storage
      .from(BUCKET)
      .download(relativePath);

    if (downloadError || !fileData) {
      const attemptedUrl = `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${encodeURIComponent(
        relativePath
      )}`;
      return { ok: false, attemptedUrl, error: downloadError?.message ?? "download_error" };
    }
    // success
    return { ok: true, fileData };
  } catch (err: unknown) {
    const attemptedUrl = `${(process.env.SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${encodeURIComponent(
      relativePath
    )}`;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, attemptedUrl, error: message };
  }
}

type ImportInsertPayload = {
  file_path: string;
  file_name: string;
  file_format: string | null;
  mapping: unknown;
  platform: unknown;
  status: "created";
  uploaded_by: string;
  created_at: string;
};

/**
 * Endpoint: POST /api/imports
 * Body (JSON) expected:
 * {
 *   file_path: string,     // can be "imports/...", "1765-...", or full storage url
 *   file_name?: string,
 *   file_format?: string,
 *   mapping?: object|null,
 *   platform?: string|null
 * }
 *
 * This handler:
 * - verifies caller via Clerk (server-side)
 * - normalizes file_path to a relative path
 * - downloads the file (using service role) to verify existence
 * - creates an import job row in a table named "imports"
 * - returns { ok: boolean, jobId: string|null, file_path: string, file_name, file_format, error? }
 *
 * This file is intended to be dropped into src/app/api/imports/route.ts and work with no edits:
 * - requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 * - expects Clerk to be configured for server (getAuth)
 */
export async function POST(req: Request) {
  try {
    // Verify Clerk session on the server. Pass the Request to getAuth to read cookies/headers.
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const incomingPath = (body.file_path ?? body.path ?? body.filePath) as string | undefined;
    if (!incomingPath) {
      return NextResponse.json({ ok: false, error: "Missing file_path in request body" }, { status: 400 });
    }

    const relativePath = normalizeToRelativePath(String(incomingPath), BUCKET);
    if (!relativePath) {
      return NextResponse.json({ ok: false, error: "Could not normalize file_path" }, { status: 400 });
    }

    // Verify file exists by downloading it with the admin client (bypass RLS)
    const verify = await verifyDownload(relativePath);
    if (!verify.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `failed to download file: ${JSON.stringify({ url: verify.attemptedUrl, reason: verify.error })}`,
          code: "download_failed",
        },
        { status: 400 }
      );
    }

    // Prepare payload for import job creation
    const canonicalFilePath = `${BUCKET}/${relativePath}`;
    const bodyFileName = typeof body.file_name === "string" ? body.file_name : undefined;
    const fileName = bodyFileName ?? relativePath.split("/").pop() ?? relativePath;
    const bodyFileFormat = typeof body.file_format === "string" ? body.file_format : undefined;
    const fileFormat = bodyFileFormat ?? fileName.split(".").pop() ?? null;
    const mapping = body.mapping ?? null;
    const platform = body.platform ?? null;

    // Attempt to create a row in table "imports" using the Supabase Admin (service role).
    // Persistence is required; this route must fail loudly when the row cannot be written.
    const insertPayload: ImportInsertPayload = {
      file_path: canonicalFilePath,
      file_name: fileName,
      file_format: fileFormat,
      mapping,
      platform,
      status: "created",
      uploaded_by: userId,
      created_at: new Date().toISOString(),
    };

    try {
      // Try inserting and returning the inserted row (most projects will have this table)
      const { data: inserted, error: insertError } = await getServerSupabase()
        .from("imports")
        .insert([insertPayload])
        .select("*")
        .limit(1)
        .maybeSingle();

      if (insertError) {
        console.error("insert into imports failed", insertError.message || insertError);
        return NextResponse.json(
          {
            ok: false,
            error: "import_persist_failed",
            detail: insertError.message || String(insertError),
            file_path: canonicalFilePath,
            file_name: fileName,
            file_format: fileFormat,
          },
          { status: 500 }
        );
      }

      // Insert succeeded — try to determine id field to return as jobId
      let jobId: string | null = null;
      if (inserted) {
        // Common id fields: id, job_id
        const row = inserted as Record<string, unknown>;
        const rawId = (row.id as string | number | null | undefined) ?? (row.job_id as string | number | null | undefined) ?? null;
        if (rawId !== null && rawId !== undefined) jobId = String(rawId);
      }

      // If no id field, generate a uuid and return it as jobId, but keep database row as authoritative
      if (!jobId) jobId = randomUUID();

      return NextResponse.json(
        {
          ok: true,
          jobId,
          file_path: canonicalFilePath,
          file_name: fileName,
          file_format: fileFormat,
          insertedRow: inserted ?? null,
        },
        { status: 200 }
      );
    } catch (errInsert: unknown) {
      // Unexpected insert failure — do not return success without a persisted row.
      console.error("Unexpected insert error into imports table:", errInsert);
      const message = errInsert instanceof Error ? errInsert.message : String(errInsert);
      return NextResponse.json(
        {
          ok: false,
          error: "import_persist_failed",
          detail: message,
          file_path: canonicalFilePath,
          file_name: fileName,
          file_format: fileFormat,
        },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("api/imports route error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
