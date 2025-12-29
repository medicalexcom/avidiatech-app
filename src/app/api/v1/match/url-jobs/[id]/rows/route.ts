import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, context: any) {
  try {
    let params = (context && context.params) ? context.params : null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    // PostgREST / supabase client doesn't support .offset(); use .range(start, end)
    const start = Math.max(0, offset);
    const end = Math.max(start, offset + Math.max(1, limit) - 1);

    let q = supabaseAdmin
      .from("match_url_job_rows")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })
      .range(start, end);

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("get rows error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
