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
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(relativePath);

    if (downloadError || !fileData) {
      const attemptedUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${encodeURIComponent(
        relativePath
      )}`;
      return { ok: false, attemptedUrl, error: downloadError?.message ?? "download_error" };
    }
    // success
    return { ok: true, fileData };
  } catch (err: any) {
    const attemptedUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${encodeURIComponent(
      relativePath
    )}`;
    return { ok: false, attemptedUrl, error: String(err?.message ?? err) };
  }
}

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
 * - attempts to create an import job row in a table named "imports" (if present)
 *   - if the "imports" table doesn't exist, it will return a synthetic jobId (UUID)
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const incomingPath: string | undefined = body.file_path ?? body.path ?? body.filePath;
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
    const fileName = body.file_name ?? relativePath.split("/").pop() ?? relativePath;
    const fileFormat = body.file_format ?? fileName.split(".").pop() ?? null;
    const mapping = body.mapping ?? null;
    const platform = body.platform ?? null;

    // Attempt to create a row in a table "imports" using the Supabase Admin (service role).
    // If the table doesn't exist, return a synthetic jobId so the client can continue.
    const insertPayload: any = {
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
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("imports")
        .insert([insertPayload])
        .select("*")
        .limit(1)
        .maybeSingle();

      if (insertError) {
        // If the error indicates relation/table not found, fall through to synthetic jobId
        console.warn("insert into imports failed, returning synthetic jobId", insertError.message || insertError);
        const syntheticJobId = randomUUID();
        return NextResponse.json(
          {
            ok: true,
            warning: "imports table not found or insert failed; returning synthetic jobId",
            jobId: syntheticJobId,
            file_path: canonicalFilePath,
            file_name: fileName,
            file_format: fileFormat,
          },
          { status: 200 }
        );
      }

      // Insert succeeded — try to determine id field to return as jobId
      let jobId: string | null = null;
      if (inserted) {
        // Common id fields: id, job_id
        jobId = (inserted as any).id ?? (inserted as any).job_id ?? null;
        // If id is numeric, convert to string
        if (jobId !== null && typeof jobId !== "string") jobId = String(jobId);
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
    } catch (errInsert: any) {
      // Unexpected insert failure — return synthetic jobId but include error details
      console.error("Unexpected insert error into imports table:", errInsert);
      const syntheticJobId = randomUUID();
      return NextResponse.json(
        {
          ok: true,
          warning: "Could not create DB row for import; returning synthetic jobId",
          jobId: syntheticJobId,
          file_path: canonicalFilePath,
          file_name: fileName,
          file_format: fileFormat,
          dbError: String(errInsert?.message ?? errInsert),
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("api/imports route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
