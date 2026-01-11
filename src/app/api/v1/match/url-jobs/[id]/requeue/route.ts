import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "jobId required" }, { status: 400 });

    const now = new Date().toISOString();

    // Update rows' status back to queued for unresolved/failed rows, return the updated rows
    const { data, error } = await supabaseAdmin
      .from("match_url_job_rows")
      .update({ status: "queued", updated_at: now })
      .in("status", ["unresolved", "failed"])
      .eq("job_id", jobId)
      .select(); // select updated rows (no extra options to avoid TS signature issues)

    if (error) {
      console.error("requeue update error:", error);
      return NextResponse.json({ ok: false, error: error.message ?? String(error) }, { status: 500 });
    }

    const requeuedCount = Array.isArray(data) ? data.length : 0;
    return NextResponse.json({ ok: true, requeued: requeuedCount }, { status: 200 });
  } catch (err: any) {
    console.error("requeue route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
