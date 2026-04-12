import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";



// GET /api/v1/match/url-jobs/[id]
export async function GET(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    const { data: job, error } = await getServerSupabase()
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
