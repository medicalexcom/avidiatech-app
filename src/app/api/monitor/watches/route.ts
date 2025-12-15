import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET() {
  try {
    // List watches (paginated? for now return recent 200)
    const { data, error } = await supabaseAdmin.from("monitor_watches").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ ok: true, watches: data }, { status: 200 });
  } catch (err: any) {
    console.error("monitor.watches GET error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.source_url) return NextResponse.json({ ok: false, error: "source_url required" }, { status: 400 });

    const payload: any = {
      source_url: body.source_url,
      watch_type: body.watch_type ?? "generic",
      tenant_id: body.tenant_id ?? null,
      product_id: body.product_id ?? null,
      frequency_seconds: body.frequency_seconds ?? 86400,
      what_to_watch: body.what_to_watch ?? "all",
      created_by: userId,
    };

    const { data, error } = await supabaseAdmin.from("monitor_watches").insert([payload]).select("*").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, watch: data }, { status: 201 });
  } catch (err: any) {
    console.error("monitor.watches POST error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
