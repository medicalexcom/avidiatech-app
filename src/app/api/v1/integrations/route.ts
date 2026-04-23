import { NextResponse } from "next/server";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data, error } = await getServerSupabase().from("integrations").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, integrations: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    let adminOk = false;
    try {
      adminOk = await isOrgAdmin(req, orgId);
    } catch {
      adminOk = false;
    }

    if (!adminOk) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { provider, name, config = {}, secrets = {} } = body;
    if (!provider) return NextResponse.json({ ok: false, error: "provider required" }, { status: 400 });

    const { data, error } = await getServerSupabase()
      .from("integrations")
      .insert({
        org_id: orgId,
        provider,
        name: name ?? provider,
        config,
        encrypted_secrets: secrets ? JSON.stringify(secrets) : null,
        status: "ready",
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, integration: data });
  } catch (err: any) {
    const status = err?.status ?? 500;
    console.error("[integrations][error]", String(err?.message ?? err));
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
