import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET /api/metrics
 * Returns a small JSON payload of basic metrics.
 */
export async function GET() {
  try {
    let totalRuns = 0;
    let totalJobs = 0;

    try {
      const runsRes = await supaAdmin.from("pipeline_runs").select("id", { count: "exact", head: true });
      // @ts-ignore - Supabase types for count are sometimes loose; normalize safely
      totalRuns = (runsRes?.count as number) ?? 0;
    } catch (e) {
      // ignore and keep zero
      totalRuns = 0;
    }

    try {
      const jobsRes = await supaAdmin.from("import_jobs").select("id", { count: "exact", head: true });
      // @ts-ignore
      totalJobs = (jobsRes?.count as number) ?? 0;
    } catch (e) {
      totalJobs = 0;
    }

    return NextResponse.json({
      ok: true,
      metrics: {
        pipeline_runs: totalRuns,
        import_jobs: totalJobs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
