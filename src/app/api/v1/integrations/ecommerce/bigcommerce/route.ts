import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { encryptJson } from "@/lib/ecommerce/crypto";

/**
 * POST: Save/replace BigCommerce connection for current tenant.
 * GET: List active BigCommerce connection metadata (no secrets).
 *
 * Body POST:
 * {
 *   store_hash: string,
 *   access_token: string,
 *   name?: string
 * }
 */
export async function POST(req: Request) {
  const a = await auth();
  const userId = (a as any)?.userId;
  const tenantId = ((a as any)?.actor?.tenantId as string) || null;

  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!tenantId) return NextResponse.json({ error: "missing_tenant" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as any;
  const store_hash = String(body?.store_hash ?? "").trim();
  const access_token = String(body?.access_token ?? "").trim();
  const name = typeof body?.name === "string" ? body.name.trim() : null;

  if (!store_hash || !access_token) {
    return NextResponse.json({ error: "missing_store_hash_or_access_token" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const secrets_enc = encryptJson({ access_token });
  const config = { store_hash };

  const { data, error } = await supabase
    .from("ecommerce_connections")
    .insert({
      tenant_id: tenantId,
      platform: "bigcommerce",
      status: "active",
      name,
      config,
      secrets_enc,
    })
    .select("id, tenant_id, platform, status, name, config, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_insert_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, connection: data }, { status: 200 });
}

export async function GET() {
  const a = await auth();
  const userId = (a as any)?.userId;
  const tenantId = ((a as any)?.actor?.tenantId as string) || null;

  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!tenantId) return NextResponse.json({ error: "missing_tenant" }, { status: 400 });

  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("ecommerce_connections")
    .select("id, tenant_id, platform, status, name, config, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("platform", "bigcommerce")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: "db_select_failed", detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, connections: data ?? [] }, { status: 200 });
}
