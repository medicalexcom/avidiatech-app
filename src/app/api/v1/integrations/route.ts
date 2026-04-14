import { NextResponse } from "next/server";
import { getOrgFromRequest } from "@/lib/auth/getOrgFromRequest";
import { throwIfNotAdmin, isOrgAdmin } from "@/lib/auth/isOrgAdmin";
import { getServerSupabase } from "@/lib/supabase";


/**
 * GET: list integrations for org (requires session)
 * POST: create integration (requires org admin)
 *
 * NOTE: This file contains temporary debug logs to diagnose 403/forbidden issues.
 * Do not log cookies or other sensitive values in production.
 */

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
    // quick diagnostics: note whether Cookie header present (do NOT log its value)
    const hasCookie = Boolean(req.headers.get("cookie"));
    console.debug("[integrations][debug] incoming POST - cookie present:", hasCookie);

    const orgId = await getOrgFromRequest(req);
    console.debug("[integrations][debug] getOrgFromRequest returned:", orgId ?? "(null)");

    if (!orgId) {
      console.debug("[integrations][debug] rejecting: no org context (likely missing session cookie)");
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Check admin status (non-throwing check) and log result for debugging
    let adminOk = false;
    try {
      adminOk = await isOrgAdmin(req, orgId);
      console.debug("[integrations][debug] isOrgAdmin returned:", adminOk);
    } catch (e: any) {
      console.debug("[integrations][debug] isOrgAdmin threw:", String(e?.message ?? e));
    }

    // Enforce admin check (existing behavior)
    if (!adminOk) {
      console.debug("[integrations][debug] rejecting: not an admin for org:", orgId);
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
    console.debug("[integrations][debug] created integration id:", data?.id ?? "(none)");
    return NextResponse.json({ ok: true, integration: data });
  } catch (err: any) {
    const status = err?.status ?? 500;
    console.error("[integrations][error]", String(err?.message ?? err));
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status });
  }
}
