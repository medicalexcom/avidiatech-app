// src/app/api/v1/bulk/[id]/items/route.ts
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("bulk_job_items")
      .select("*")
      .eq("bulk_job_id", params.id)
      .order("item_index", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
