import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/v1/bulk/:id
 *
 * Robustly extract :id from context.params or fallback to parsing request.url.
 */
function extractId(request: NextRequest, context: any): string | null {
  const ctxId = context?.params?.id;
  if (ctxId) return String(ctxId);
  try {
    const url = new URL(request.url);
    // matches /api/v1/bulk/<id>(/...)
    const m = url.pathname.match(/\/api\/v1\/bulk\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (e) {
    // ignore
  }
  return null;
}

export async function GET(request: NextRequest, context: any) {
  try {
    const id = extractId(request, context);
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.from("bulk_jobs").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("bulk job fetch error", error);
      throw error;
    }
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/v1/bulk/:id error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
