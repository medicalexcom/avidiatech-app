// Start route: processes queued rows for the given job using the SerpAPI matcher.
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { processRow } from "../../../../../../../../lib/match/matcher";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE env vars");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    // fetch queued rows for this job (limit to avoid long requests)
    const batchLimit = Number(process.env.MATCH_BATCH_LIMIT ?? 25);
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("match_url_job_rows")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(batchLimit);

    if (fetchErr) {
      console.error("failed to fetch queued rows:", fetchErr);
      return NextResponse.json({ ok: false, error: String(fetchErr.message ?? fetchErr) }, { status: 500 });
    }

    // If there are no queued rows, return quickly
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "no queued rows" }, { status: 200 });
    }

    // mark job running (best-effort)
    try {
      await supabaseAdmin.from("match_url_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);
    } catch (err) { /* ignore */ }

    let processed = 0;
    const results: any[] = [];

    for (const row of rows) {
      try {
        const r = await processRow(row);
        results.push({ row_id: row.row_id ?? row.id, result: r });
      } catch (err) {
        console.error("processRow error for", row.id, err);
        results.push({ row_id: row.row_id ?? row.id, error: String(err?.message ?? err) });
      }
      processed += 1;
    }

    // Update job stats: compute unresolved/resolved counts (best-effort)
    try {
      const { data: counts } = await supabaseAdmin
        .from("match_url_job_rows")
        .select("status", { count: "exact" })
        .eq("job_id", jobId);
      // counts may not be reliable depending on driver; instead compute resolved/unresolved via simple queries
      const { data: resCount } = await supabaseAdmin.from("match_url_job_rows").select("id").eq("job_id", jobId).in("status", ["resolved_confident", "resolved"]).maybeSingle();
      // best-effort set job to succeeded (or partial)
      await supabaseAdmin.from("match_url_jobs").update({ status: "partial", updated_at: new Date().toISOString() }).eq("id", jobId);
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ ok: true, processed, results }, { status: 200 });
  } catch (err: any) {
    console.error("start route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
