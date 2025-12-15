import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE env required");
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET /api/metrics
 * Returns a small JSON payload of basic metrics; can be adapted to Prometheus text output.
 */
export async function GET() {
  try {
    const [{ count: totalRuns }, { count: totalJobs }] = await Promise.all([
      supaAdmin.rpc("count_pipeline_runs").then((r: any) => ({ count: r?.count ?? 0 })).catch(() => ({ count: 0 })),
      supaAdmin.rpc("count_import_jobs").then((r: any) => ({ count: r?.count ?? 0 })).catch(() => ({ count: 0 })),
    ]).catch(() => [{ count: 0 }, { count: 0 }]);

    return NextResponse.json({ ok: true, metrics: { pipeline_runs: totalRuns, import_jobs: totalJobs, timestamp: new Date().toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
