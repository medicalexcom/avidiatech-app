import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function resolveParams(context: any) {
  if (!context) return undefined;
  const p = context.params;
  if (!p) return undefined;
  return p;
}

export async function PATCH(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = resolveParams(context);
    if (params && typeof params.then === "function") params = await params;
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const allowed: any = {};
    const fields = ["frequency_seconds", "price_threshold_percent", "muted_until", "sensitivity", "auto_watch"];
    for (const f of fields) {
      if (body[f] !== undefined) allowed[f] = body[f];
    }
    if (Object.keys(allowed).length === 0) return NextResponse.json({ ok: false, error: "no updatable fields provided" }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("monitor_watches").update(allowed).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, watch: data }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH monitor watch error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let params = resolveParams(context);
    if (params && typeof params.then === "function") params = await params;
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("monitor_watches").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE monitor watch error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
