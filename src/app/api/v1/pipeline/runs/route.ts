import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return recent pipeline runs for an ingestionId.
 * - Expects table pipeline_runs with ingestion_id, status, created_at, duration_ms
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ingestionId = url.searchParams.get("ingestionId");
    if (!ingestionId) return NextResponse.json({ ok: false, error: "ingestionId required" }, { status: 400 });

    const { data, error } = await supaAdmin.from("pipeline_runs").select("*").eq("ingestion_id", ingestionId).order("created_at", { ascending: false }).limit(10);
    if (error) throw error;
    return NextResponse.json({ ok: true, runs: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
