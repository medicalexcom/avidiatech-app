import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs"; // ensure Node runtime for Buffer support

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    // Clerk server-side auth check — pass the incoming Request to getAuth
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // parse multipart form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalName = file.name ?? `file-${Date.now()}`;
    const safeName = originalName.replace(/\s+/g, "_");
    const path = `${Date.now()}-${safeName}`;

    // Upload to Supabase Storage (service role)
    const { data, error } = await supabaseAdmin.storage
      .from("imports")
      .upload(path, buffer, { contentType: file.type ?? undefined, upsert: false });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message ?? error }, { status: 500 });
    }

    // Optionally: create import job server-side here and return job id
    // e.g. const job = await createImportJob({ bucket: 'imports', path, uploadedBy: userId });

    return NextResponse.json({ data, uploadedBy: userId }, { status: 200 });
  } catch (err: any) {
    console.error("upload route error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
