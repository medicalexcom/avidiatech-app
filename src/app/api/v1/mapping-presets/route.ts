import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/**
 * GET: list mapping presets for org
 * POST: create a mapping preset (admin only)
 */
export async function GET(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supaAdmin.from("mapping_presets").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, presets: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    await throwIfNotAdmin(req, orgId);

    const body = await req.json().catch(() => ({}));
    const { provider, name, mapping } = body;
    if (!provider || !name || !mapping) return NextResponse.json({ ok: false, error: "provider, name, mapping required" }, { status: 400 });

    const { data, error } = await supaAdmin
      .from("mapping_presets")
      .insert({ org_id: orgId, provider, name, mapping })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, preset: data });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
