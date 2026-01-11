import { NextResponse, type NextRequest } from "next/server";
import { requireTenantFromRequest } from "@/lib/monitor/tenant";
import { getQueue } from "@/lib/queue/bull";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantFromRequest(req as any);
    const body = (await req.json().catch(() => ({}))) as any;

    const watchId = (body?.watch_id ?? body?.watchId ?? "").toString().trim();
    if (!watchId) return NextResponse.json({ ok: false, error: "missing_watch_id" }, { status: 400 });

    // Ensure watch exists and belongs to tenant
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("monitor_watchlist")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", watchId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: "watch_lookup_failed", detail: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const q = getQueue("monitor:crawl");
    await q.add(
      "monitor:crawl",
      { tenant_id: tenantId, watch_id: watchId },
      { attempts: 2, backoff: { type: "exponential", delay: 2000 } }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "unauthenticated") return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}
