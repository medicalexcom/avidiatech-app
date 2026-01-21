import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE env vars");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// GET /api/v1/match/url-jobs/[id]
export async function GET(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    const { data: job, error } = await supabaseAdmin
      .from("match_url_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      console.error("fetch job error:", error);
      return NextResponse.json({ ok: false, error: error.message ?? String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, job: job ?? null }, { status: 200 });
  } catch (err: any) {
    console.error("job route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
