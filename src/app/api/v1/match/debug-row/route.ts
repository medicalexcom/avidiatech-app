import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { debugRowTrace } from "../../../../../../lib/match/matcher";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const jobId = body?.job_id;
    const rowId = body?.row_id;

    if (!jobId || !rowId) return NextResponse.json({ ok: false, error: "job_id and row_id required" }, { status: 400 });

    const { data: row } = await supabaseAdmin
      .from("match_url_job_rows")
      .select("*")
      .eq("job_id", jobId)
      .eq("row_id", rowId)
      .maybeSingle();

    if (!row) return NextResponse.json({ ok: false, error: "row not found" }, { status: 404 });

    // run debug trace (no DB writes)
    const trace = await debugRowTrace(row);
    return NextResponse.json({ ok: true, trace }, { status: 200 });
  } catch (err: any) {
    console.error("debug-row route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
