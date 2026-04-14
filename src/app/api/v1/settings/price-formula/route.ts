// src/app/api/v1/settings/price-formula/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { isOrgAdmin } from "@/lib/auth/isOrgAdmin";

const SETTING_KEY = "price_formula";

/**
 * GET
 * - Returns tenant-specific formula if x-tenant-id header is present and a setting exists for it.
 * - Otherwise returns the global (tenant_id IS NULL) formula or null.
 */
export async function GET(req: NextRequest) {
  try {
    const supa = getServiceSupabaseClient();
    const tenantHeader = req.headers.get("x-tenant-id") ?? null;
    const tenantId = tenantHeader && tenantHeader.trim().length > 0 ? tenantHeader.trim() : null;

    if (tenantId) {
      const { data: tenantSetting, error: tErr } = await supa
        .from("settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (tErr) {
        console.error("GET price-formula tenant read failed", tErr);
        return NextResponse.json({ ok: false, error: String(tErr.message ?? tErr) }, { status: 500 });
      }

      if (tenantSetting) return NextResponse.json({ ok: true, value: tenantSetting.value }, { status: 200 });
    }

    // fallback to global
    const { data: globalSetting, error: gErr } = await supa
      .from("settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .is("tenant_id", null)
      .maybeSingle();

    if (gErr) {
      console.error("GET price-formula global read failed", gErr);
      return NextResponse.json({ ok: false, error: String(gErr.message ?? gErr) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, value: globalSetting?.value ?? null }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/settings/price-formula error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

/**
 * PUT
 * - Upserts a price formula for a tenant (tenantId in body) or global (tenantId=null).
 * - Only authenticated users are allowed; you should enforce admin/owner checks here.
 * - Body shape: { tenantId?: string|null, value: any }
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) ?? {};
    const tenantIdRaw = body?.tenantId ?? null;
    const tenantId = tenantIdRaw && String(tenantIdRaw).trim().length > 0 ? String(tenantIdRaw) : null;
    const value = body?.value ?? null;

    // Enforce admin/owner role: only org admins or owners may write price formulas.
    if (tenantId) {
      const admin = await isOrgAdmin(req as any, tenantId);
      if (!admin) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    if (value == null) {
      return NextResponse.json({ ok: false, error: "missing_value" }, { status: 400 });
    }

    const supa = getServiceSupabaseClient();

    // Upsert: use onConflict as a single string (supabase-js types expect a string)
    // We rely on unique index (key, tenant_id) existing in DB (migration should create it).
    const upsertPayload = [{ key: SETTING_KEY, value, tenant_id: tenantId }];

    const { data, error } = await supa
      .from("settings")
      .upsert(upsertPayload, { onConflict: "key,tenant_id" })
      .select("*");

    if (error) {
      console.error("settings upsert failed", error);
      return NextResponse.json({ ok: false, error: String(error.message ?? error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data?.[0] ?? null }, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/v1/settings/price-formula error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
