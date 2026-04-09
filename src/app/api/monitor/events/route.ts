import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const watchId = url.searchParams.get("watchId") ?? undefined;
    let q = getServerSupabase().from("monitor_events").select("*").order("created_at", { ascending: false }).limit(200);
    if (watchId) q = q.eq("watch_id", watchId);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, events: data }, { status: 200 });
  } catch (err: any) {
    console.error("monitor.events GET error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
