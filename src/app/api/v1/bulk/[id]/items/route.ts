import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest, context: any) {
  try {
    const params = (context?.params ?? {}) as { id?: string };
    const id = String(params.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const supabase = getServiceSupabaseClient();
    let query: any = supabase.from("bulk_job_items").select("*").eq("bulk_job_id", id).order("item_index", { ascending: true });

    if (!Number.isNaN(limit) && limit > 0) {
      const from = offset;
      const to = offset + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
