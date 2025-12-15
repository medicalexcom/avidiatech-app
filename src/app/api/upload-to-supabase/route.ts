import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

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

async function normalizeReturnedPath(data: any, bucket = BUCKET) {
  // Attempt to find common path keys returned by different SDKs/clients
  let p: string | undefined;
  if (!data) return undefined;
  if (typeof data.path === "string") p = data.path;
  else if (typeof data.Key === "string") p = data.Key;
  else if (typeof data.key === "string") p = data.key;
  else if (typeof data === "string") p = data;

  if (!p) return undefined;
  // Strip leading bucket prefix if present: "imports/..."
  p = p.replace(new RegExp(`^${bucket}\\/`), "");
  // Strip any leading slashes
  p = p.replace(/^\/+/, "");
  return p;
}

export async function POST(req: Request) {
  try {
    // Verify Clerk session on the server. Pass the Request to getAuth to read cookies/headers.
    // (Using req as any to satisfy types in some Clerk versions)
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart/form-data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build a safe filename/path
    const originalName = file.name ?? `file-${Date.now()}`;
    const safeName = originalName.replace(/\s+/g, "_");
    const path = `${Date.now()}-${safeName}`;

    // Upload to Supabase Storage using admin (service role)
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type ?? undefined, upsert: false });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message ?? error }, { status: 500 });
    }

    // Normalize the returned path to be relative to the bucket (no "imports/" prefix)
    const relativePath = await normalizeReturnedPath(data, BUCKET);

    // If you want to create the import job server-side and return the jobId, do it here.
    // Example pseudocode:
    // const job = await createImportJob({ file_path: `${BUCKET}/${relativePath}`, file_name: originalName, uploadedBy: userId, mapping: ... });
    // return NextResponse.json({ ok: true, jobId: job.id, path: relativePath }, { status: 200 });

    return NextResponse.json(
      {
        ok: true,
        data: {
          // return a normalized path relative to the bucket, and the original upload data
          path: relativePath,
          raw: data,
        },
        uploadedBy: userId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("upload-to-supabase route error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
