import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const watchId = url.searchParams.get("watchId") ?? undefined;
    let q = supabaseAdmin.from("monitor_events").select("*").order("created_at", { ascending: false }).limit(200);
    if (watchId) q = q.eq("watch_id", watchId);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, events: data }, { status: 200 });
  } catch (err: any) {
    console.error("monitor.events GET error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
