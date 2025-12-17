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

    // Requeue rows that are unresolved or failed (you may adjust statuses)
    const { error, count } = await supabaseAdmin
      .from("match_url_job_rows")
      .update({ status: "queued", updated_at: new Date().toISOString() })
      .in("status", ["unresolved", "failed"])
      .eq("job_id", jobId)
      .select("*", { count: "exact" });

    if (error) {
      console.error("requeue update error:", error);
      return NextResponse.json({ ok: false, error: error.message ?? String(error) }, { status: 500 });
    }

    // Note: some Supabase versions return count differently; we'll return a success with the updated rows count if available.
    // If count not available, return ok:true and let the client poll rows.
    const updatedCount = Array.isArray(count) ? count.length : null;
    return NextResponse.json({ ok: true, requeued: updatedCount ?? null }, { status: 200 });
  } catch (err: any) {
    console.error("requeue route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
