import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getQueue } from "@/lib/queue/bull";

function requireCronAuth(req: NextRequest): boolean {
  const provided = req.headers.get("x-cron-secret") || "";
  const expected = process.env.CRON_SECRET || "";
  return !!(expected && provided && provided === expected);
}

function jitterMs(maxMinutes: number) {
  return Math.floor(Math.random() * maxMinutes * 60_000);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    if (!requireCronAuth(req)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const supabase = getServerSupabase();
    const q = getQueue("monitor:crawl");

    // Fetch due items (simple strategy; safe enough with conservative limits)
    // For strong locking you'd add an RPC with SKIP LOCKED; start simple.
    const limit = Math.min(200, Math.max(1, Number(process.env.MONITOR_CRON_BATCH ?? 100)));

    const { data: due, error } = await supabase
      .from("monitor_watchlist")
      .select("id, tenant_id, frequency_minutes")
      .eq("status", "active")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: "fetch_failed", detail: error.message }, { status: 500 });
    }

    const rows = due ?? [];
    if (rows.length === 0) return NextResponse.json({ ok: true, enqueued: 0 }, { status: 200 });

    // Claim by pushing next_run_at forward quickly to reduce duplicates
    // then enqueue jobs
    let enqueued = 0;
    for (const r of rows) {
      const temporaryHold = new Date(Date.now() + 60_000 + jitterMs(1)).toISOString(); // 1-2min
      await supabase
        .from("monitor_watchlist")
        .update({ last_checked_at: new Date().toISOString(), next_run_at: temporaryHold })
        .eq("id", r.id)
        .eq("tenant_id", r.tenant_id);

      await q.add(
        "monitor:crawl",
        { tenant_id: r.tenant_id, watch_id: r.id },
        { attempts: 2, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: true }
      );
      enqueued++;
    }

    return NextResponse.json({ ok: true, enqueued }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
