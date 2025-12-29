// src/app/api/v1/bulk/[id]/items/errors/route.ts
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

function csvEscape(s: any) {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : JSON.stringify(s);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("bulk_job_items")
      .select("item_index,input_url,last_error,ingestion_id,pipeline_run_id,tries,created_at")
      .eq("bulk_job_id", params.id)
      .eq("status", "failed")
      .order("item_index", { ascending: true });

    if (error) throw error;

    const header = ["item_index", "input_url", "ingestion_id", "pipeline_run_id", "tries", "last_error", "created_at"];
    const rows = data?.map((r: any) => header.map((h) => csvEscape(r[h])).join(",")).join("\n") ?? "";

    const csv = `${header.join(",")}\n${rows}`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bulk-${params.id}-errors.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
