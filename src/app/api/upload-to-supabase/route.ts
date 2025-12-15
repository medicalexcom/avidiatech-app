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

    const { data, error } = await supabaseAdmin.storage
      .from("imports")
      .upload(path, buffer, { contentType: file.type ?? undefined, upsert: false });
    
    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message ?? error }, { status: 500 });
    }
    
    // Normalize returned path to be relative to the bucket
    // supabase storage responses sometimes return "imports/<path>" — strip the "imports/" prefix
    let returnedPath: string | undefined = undefined;
    if (data && typeof data.path === "string") {
      returnedPath = data.path.replace(/^imports\//, "");
    } else if (data && typeof data.Key === "string") {
      returnedPath = data.Key.replace(/^imports\//, "");
    }
    
    // Return the relative path in data.path
    return NextResponse.json({ data: { path: returnedPath }, uploadedBy: userId }, { status: 200 });
  }
}
