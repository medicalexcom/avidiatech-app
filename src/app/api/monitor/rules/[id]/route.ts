import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const allowed: any = {};
    for (const f of ["name", "enabled", "event_type", "condition", "action"]) {
      if (body[f] !== undefined) allowed[f] = body[f];
    }
    if (Object.keys(allowed).length === 0) return NextResponse.json({ ok: false, error: "no fields" }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("monitor_rules").update(allowed).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, rule: data }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH rule error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("monitor_rules").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE rule error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
