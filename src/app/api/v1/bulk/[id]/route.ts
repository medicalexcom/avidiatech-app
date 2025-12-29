import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
