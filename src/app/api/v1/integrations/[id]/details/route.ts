import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/v1/integrations/:id/details
 *
 * Returns a normalized integration object. This implementation:
 * - Selects '*' from the integrations row (prevents TypeScript/SQL errors when a particular column is absent)
 * - If not found in integrations, attempts to find an ecommerce_connection row and normalize it
 * - Normalizes the shape to: { id, provider, name, config, created_at, updated_at, org_id|tenant_id, status, last_error }
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE environment variables for integrations details route");
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeLegacyIntegration(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider ?? row.name ?? null,
    platform: row.platform ?? null,
    name: row.name ?? row.display_name ?? row.provider ?? row.id,
    config: row.config ?? {},
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? row.updated ?? row.last_synced_at ?? null,
    org_id: row.org_id ?? row.tenant_id ?? null,
    tenant_id: row.tenant_id ?? row.org_id ?? null,
    status: row.status ?? null,
    last_error: row.last_error ?? row.error ?? null,
    raw: row,
  };
}

function normalizeEcommerceConnection(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.platform ?? "ecommerce",
    platform: row.platform ?? null,
    name: row.name ?? row.config?.store_name ?? null,
    config: row.config ?? {},
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    tenant_id: row.tenant_id ?? null,
    org_id: row.tenant_id ?? null,
    status: row.status ?? null,
    last_error: row.last_error ?? null,
    raw: row,
  };
}

export async function GET(req: Request, ctx: any) {
  // retrieve the id param robustly
  let params = ctx?.params;
  if (params && typeof params.then === "function") params = await params;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  }

  try {
    // 1) Try legacy integrations table (select * avoids column-not-found issues)
    const { data: legacyRow, error: legacyErr } = await supaAdmin
      .from("integrations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (legacyErr) {
      // log and continue — we will fallback to ecommerce_connections below
      console.warn("[integrations/details] legacy select error:", legacyErr.message);
    }
    if (legacyRow) {
      const normalized = normalizeLegacyIntegration(legacyRow);
      return NextResponse.json({ ok: true, integration: normalized }, { status: 200 });
    }

    // 2) Fallback to ecommerce_connections table (normalized shape)
    const { data: ecoRow, error: ecoErr } = await supaAdmin
      .from("ecommerce_connections")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (ecoErr) {
      console.warn("[integrations/details] ecommerce_connections select error:", ecoErr.message);
    }
    if (ecoRow) {
      const normalized = normalizeEcommerceConnection(ecoRow);
      return NextResponse.json({ ok: true, integration: normalized }, { status: 200 });
    }

    // Not found in either table
    return NextResponse.json({ ok: false, error: "not_found", detail: "integration not found" }, { status: 404 });
  } catch (e: any) {
    console.error("[integrations/details] exception:", String(e?.message ?? e));
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
