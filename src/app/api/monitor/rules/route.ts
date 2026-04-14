import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServerSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await getServerSupabase().from("monitor_rules").select("*").order("created_at", { ascending: false }).limit(500);
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

    const { data, error } = await getServerSupabase().from("monitor_rules").insert([insert]).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, rule: data }, { status: 201 });
  } catch (err: any) {
    console.error("POST monitor rules error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
