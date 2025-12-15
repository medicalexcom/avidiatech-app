import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Return integration details (safe view).
 * - DOES NOT return sensitive encrypted_secrets.
 * - Use for the UI to fetch last synced time and status.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { data, error } = await supaAdmin.from("integrations").select("id, provider, name, config, status, created_at, updated_at, last_synced_at").eq("id", id).single();
    if (error) throw error;
    return NextResponse.json({ ok: true, integration: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
