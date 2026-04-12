import { NextResponse } from "next/server";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";
import { getServerSupabase } from "@/lib/supabase";


export async function GET(req: Request, context: any) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { id } = context?.params ?? {};
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const { data, error } = await getServerSupabase().from("mapping_presets").select("*").eq("id", id).single();
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

    const { data: existing, error: findErr } = await getServerSupabase().from("mapping_presets").select("*").eq("id", id).single();
    if (findErr) throw findErr;
    if (!existing || existing.org_id !== orgId) return NextResponse.json({ ok: false, error: "Not found or access denied" }, { status: 404 });

    const { error: delErr } = await getServerSupabase().from("mapping_presets").delete().eq("id", id);
    if (delErr) throw delErr;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
