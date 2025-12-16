import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchUrlJob } from "@/worker/jobs/matchUrlJob";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // resolve params (Next may provide as promise)
    let params = (context && context.params) ? context.params : null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    if (!jobId) return NextResponse.json({ ok: false, error: "job id required" }, { status: 400 });

    // set running
    await supabaseAdmin.from("match_url_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);

    // start work asynchronously (don't await)
    (async () => {
      try {
        await processMatchUrlJob(jobId);
      } catch (err) {
        console.error("processMatchUrlJob error:", err);
        await supabaseAdmin.from("match_url_jobs").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", jobId);
      }
    })();

    return NextResponse.json({ ok: true, starting: true }, { status: 200 });
  } catch (err:any) {
    console.error("start job error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
