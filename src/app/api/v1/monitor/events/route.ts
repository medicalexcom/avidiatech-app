import { NextResponse, type NextRequest } from "next/server";
import { requireTenantFromRequest } from "@/lib/monitor/tenant";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantFromRequest(req as any);
    const url = new URL(req.url);

    const watchId = (url.searchParams.get("watch_id") ?? "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

    const supabase = getServerSupabase();
    let query = supabase
      .from("monitor_events")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (watchId) query = query.eq("watch_id", watchId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ ok: false, error: "fetch_failed", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [], count: count ?? null }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "unauthenticated") return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}
