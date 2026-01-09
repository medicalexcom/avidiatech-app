import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from("monitor_rules").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return NextResponse.json({ ok: true, rules: data }, { status: 200 });
  } catch (err: any) {
    console.error("GET monitor rules error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (!body?.name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });

    const insert = {
      name: body.name,
      tenant_id: body.tenant_id ?? null,
      event_type: body.event_type ?? "change_detected",
      condition: body.condition ?? {},
      action: body.action ?? {},
      created_by: userId,
    };

    const { data, error } = await supabaseAdmin.from("monitor_rules").insert([insert]).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, rule: data }, { status: 201 });
  } catch (err: any) {
    console.error("POST monitor rules error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
