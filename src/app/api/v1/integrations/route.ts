import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin } from "@/lib/auth/isOrgAdmin";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const orgId = await getOrgFromRequest(req);
    if (!orgId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supaAdmin.from("integrations").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, integrations: data ?? [] });
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
    const { provider, name, config = {}, secrets = {} } = body;
    if (!provider) return NextResponse.json({ ok: false, error: "provider required" }, { status: 400 });

    const { data, error } = await supaAdmin
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
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
