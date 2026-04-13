// Start route: processes queued rows for the given job using the SerpAPI matcher.
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServerSupabase } from "@/lib/supabase";
// Correct relative path (7 levels up from this file) to reach src/lib/match/matcher
import { processRow } from "../../../../../../../lib/match/matcher";

export const runtime = "nodejs";



export async function POST(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    // NEW: load job header to get manufacturer_domain (authoritative scope if set)
    const { data: job, error: jobErr } = await getServerSupabase()
      .from("match_url_jobs")
      .select("manufacturer_domain, manufacturer_url")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr) {
      console.error("failed to fetch job header:", jobErr);
      return NextResponse.json({ ok: false, error: String(jobErr.message ?? jobErr) }, { status: 500 });
    }

    const manufacturerDomain = (job?.manufacturer_domain ?? null) as string | null;

    // fetch queued rows for this job (limit to avoid long requests)
    const batchLimit = Number(process.env.MATCH_BATCH_LIMIT ?? 25);
    const { data: rows, error: fetchErr } = await getServerSupabase()
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
      await getServerSupabase().from("match_url_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);
    } catch (err) { /* ignore */ }

    let processed = 0;
    const results: any[] = [];

    for (const row of rows) {
      try {
        // NEW: attach manufacturer_domain to each row so matcher uses it instead of guessing
        const r = await processRow({ ...row, manufacturer_domain: manufacturerDomain });
        results.push({ row_id: row.row_id ?? row.id, result: r });
      } catch (err: any) {
        console.error("processRow error for", row.id, err);
        results.push({ row_id: row.row_id ?? row.id, error: String(err?.message ?? err) });
      }
      processed += 1;
    }

    // Update job stats: compute unresolved/resolved counts (best-effort)
    try {
      // best-effort set job to partial (worker may update later)
      await getServerSupabase().from("match_url_jobs").update({ status: "partial", updated_at: new Date().toISOString() }).eq("id", jobId);
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ ok: true, processed, manufacturer_domain: manufacturerDomain, results }, { status: 200 });
  } catch (err: any) {
    console.error("start route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
