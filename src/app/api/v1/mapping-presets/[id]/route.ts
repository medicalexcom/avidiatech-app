import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { id } = context?.params ?? {};
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const { data, error } = await supaAdmin.from("mapping_presets").select("*").eq("id", id).single();
    if (error) throw error;
    if (!data || data.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    return NextResponse.json({ ok: true, preset: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    await throwIfNotAdmin(req, orgId);

    const { id } = context?.params ?? {};
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const { data: existing, error: findErr } = await supaAdmin.from("mapping_presets").select("*").eq("id", id).single();
    if (findErr) throw findErr;
    if (!existing || existing.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    const { error: delErr } = await supaAdmin.from("mapping_presets").delete().eq("id", id);
    if (delErr) throw delErr;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
