import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest, context: any) {
  try {
    const params = (context?.params ?? {}) as { id?: string };
    const id = String(params.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
