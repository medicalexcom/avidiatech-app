import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

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

function csvEscape(s: any) {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : JSON.stringify(s);
  return `"${String(str).replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest, context: any) {
  try {
    const id = extractId(request, context);
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("bulk_job_items")
      .select("item_index,input_url,last_error,ingestion_id,pipeline_run_id,tries,created_at")
      .eq("bulk_job_id", id)
      .eq("status", "failed")
      .order("item_index", { ascending: true });

    if (error) {
      console.error("bulk job errors fetch error", error);
      throw error;
    }

    const header = ["item_index", "input_url", "ingestion_id", "pipeline_run_id", "tries", "last_error", "created_at"];
    const rows = (data ?? []).map((r: any) => header.map((h) => csvEscape(r[h])).join(",")).join("\n");
    const csv = `${header.join(",")}\n${rows}`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bulk-${id}-errors.csv"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/bulk/:id/items/errors error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
