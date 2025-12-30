import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/** same robust id extraction */
function extractId(request: NextRequest, context: any): string | null {
  const ctxId = context?.params?.id;
  if (ctxId) return String(ctxId);
  try {
    const url = new URL(request.url);
    const m = url.pathname.match(/\/api\/v1\/bulk\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (e) {}
  return null;
}

export async function GET(request: NextRequest, context: any) {
  try {
    const id = extractId(request, context);
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const url = new URL(request.url);
    const limit = Math.max(0, parseInt(url.searchParams.get("limit") || "200", 10) || 200);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

    const supabase = getServiceSupabaseClient();
    let query: any = supabase.from("bulk_job_items").select("*").eq("bulk_job_id", id).order("item_index", { ascending: true });
    if (limit > 0) {
      const from = offset;
      const to = offset + limit - 1;
      query = query.range(from, to);
    }
    const { data, error } = await query;
    if (error) {
      console.error("bulk items fetch error", error);
      throw error;
    }
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/v1/bulk/:id/items error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
