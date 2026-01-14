// src/app/api/v1/settings/price-formula/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

const SETTING_KEY = "price_formula";

export async function GET(req: NextRequest) {
  const supa = getServiceSupabaseClient();
  const tenantId = String(req.headers.get("x-tenant-id") ?? "") || null; // optional
  // Prefer tenant-specific value, fall back to global (tenant_id IS NULL)
  const { data: tenantSetting } = await supa.from("settings").select("value").eq("key", SETTING_KEY).eq("tenant_id", tenantId).maybeSingle();
  if (tenantSetting) return NextResponse.json({ ok: true, value: tenantSetting.value }, { status: 200 });
  const { data: globalSetting } = await supa.from("settings").select("value").eq("key", SETTING_KEY).is("tenant_id", null).maybeSingle();
  return NextResponse.json({ ok: true, value: globalSetting?.value ?? null }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  // Only admins may update formula
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  // TODO: check admin membership/role: make sure user is organization owner/admin
  // For demo we assume user is authorized. Implement role check using team_members table.

  const body = await req.json().catch(() => ({}));
  const tenantId = body?.tenantId ?? null;
  const value = body?.value ?? null; // expected JSON: { type: 'js'|'legacy', code?: string, legacyOptions?: {...} }

  if (!value) return NextResponse.json({ ok: false, error: "missing_value" }, { status: 400 });

  const supa = getServiceSupabaseClient();

  // Upsert setting (key + tenant_id unique)
  // Use RPC or workaround: delete+insert upsert semantics
  const { data, error } = await supa
    .from("settings")
    .upsert(
      [{ key: SETTING_KEY, value, tenant_id: tenantId }],
      { onConflict: ["key", "tenant_id"], returning: "representation" }
    )
    .select("*");

  if (error) {
    console.error("settings upsert failed", error);
    return NextResponse.json({ ok: false, error: String(error.message ?? error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data?.[0] ?? null }, { status: 200 });
}
