// Inspect presence of server env vars (TEMPORARY debug endpoint).
// Add DEBUG_SECRET in Vercel to restrict access, e.g. process.env.DEBUG_SECRET="hunter2"
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const header = req.headers.get("x-debug-secret") || "";
  const expected = process.env.DEBUG_SECRET || "";
  if (!expected || header !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Only return boolean presence / lengths — do NOT return secret values
  return NextResponse.json({
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    INGEST_SECRET: !!process.env.INGEST_SECRET
  });
}
