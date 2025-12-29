import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const { data, error } = await supabaseAdmin.from("monitor_notifications").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return NextResponse.json({ ok: true, notifications: data }, { status: 200 });
  } catch (err: any) {
    console.error("GET notifications error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const allowed: any = {};
    if (body.read !== undefined) allowed.read = !!body.read;

    const { data, error } = await supabaseAdmin.from("monitor_notifications").update(allowed).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, notification: data }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH notifications error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
