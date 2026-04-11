import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

/**
 * Return recent pipeline runs for an ingestionId.
 * - Expects table pipeline_runs with ingestion_id, status, created_at, duration_ms
 */


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ingestionId = url.searchParams.get("ingestionId");
    if (!ingestionId) return NextResponse.json({ ok: false, error: "ingestionId required" }, { status: 400 });

    const { data, error } = await getServerSupabase().from("pipeline_runs").select("*").eq("ingestion_id", ingestionId).order("created_at", { ascending: false }).limit(10);
    if (error) throw error;
    return NextResponse.json({ ok: true, runs: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
