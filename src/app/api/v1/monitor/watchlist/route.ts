import { NextResponse, type NextRequest } from "next/server";
import { requireTenantFromRequest } from "@/lib/monitor/tenant";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantFromRequest(req as any);
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const domain = (url.searchParams.get("domain") ?? "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

    const supabase = getServerSupabase();

    let query = supabase
      .from("monitor_watchlist")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("next_run_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (domain) query = query.eq("domain", domain);
    if (q) {
      // best-effort contains filter (PostgREST ilike)
      query = query.ilike("url_norm", `%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ ok: false, error: "fetch_failed", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [], count: count ?? null }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "unauthenticated") return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantFromRequest(req as any);
    const body = (await req.json().catch(() => ({}))) as any;

    const id = (body?.id ?? "").toString();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const updates: any = {};
    if (body.frequency_minutes !== undefined) updates.frequency_minutes = Number(body.frequency_minutes);
    if (body.watch_flags !== undefined) updates.watch_flags = body.watch_flags;
    if (body.policy !== undefined) updates.policy = body.policy;
    if (body.status !== undefined) updates.status = String(body.status);

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("monitor_watchlist")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: "update_failed", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item: data ?? null }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg === "unauthenticated") return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "internal_error", detail: msg }, { status: 500 });
  }
}
