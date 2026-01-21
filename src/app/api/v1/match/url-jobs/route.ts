import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

// Configured mapping (optional)
const TENANT_MAPPING_TABLE = process.env.TENANT_MAPPING_TABLE ?? "tenants";
const TENANT_MAPPING_ORG_COLUMN = process.env.TENANT_MAPPING_ORG_COLUMN ?? "clerk_org_id";
const TENANT_MAPPING_ID_COLUMN = process.env.TENANT_MAPPING_ID_COLUMN ?? "id";

// Fallback mapping table we will create via migration
const AUTO_MAPPING_TABLE = "match_tenant_mappings";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function isUuid(s?: string | null) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Try to resolve tenant uuid using:
 *  - explicitTenant (if provided and valid UUID)
 *  - configured mapping table (TENANT_MAPPING_TABLE)
 *  - heuristics (common table/col combos)
 *  - auto mapping table (match_tenant_mappings): if present, use it
 * If none found returns null.
 */
async function findExistingTenant(explicitTenant?: string | null, orgId?: string | null) {
  if (explicitTenant) {
    if (isUuid(explicitTenant)) return explicitTenant;
    throw new Error(`Invalid tenant_id: expected UUID but got "${explicitTenant}"`);
  }
  if (!orgId) return null;

  // 1) Try configured mapping table
  try {
    const sel = `${TENANT_MAPPING_ID_COLUMN}`;
    const { data, error } = await supabaseAdmin
      .from(TENANT_MAPPING_TABLE)
      .select(sel)
      .eq(TENANT_MAPPING_ORG_COLUMN, orgId)
      .limit(1)
      .maybeSingle();
    if (!error && data && data[TENANT_MAPPING_ID_COLUMN] && isUuid(String(data[TENANT_MAPPING_ID_COLUMN]))) {
      return String(data[TENANT_MAPPING_ID_COLUMN]);
    }
  } catch (err) {
    // ignore and continue
  }

  // 2) Try auto mapping table (if someone pre-populated)
  try {
    const { data, error } = await supabaseAdmin
      .from(AUTO_MAPPING_TABLE)
      .select("tenant_id")
      .eq("clerk_org_id", orgId)
      .limit(1)
      .maybeSingle();
    if (!error && data && data.tenant_id && isUuid(String(data.tenant_id))) {
      return String(data.tenant_id);
    }
  } catch (err) {
    // ignore
  }

  // 3) Heuristics (best-effort). Try some common table/column combos.
  // Keep this as a non-failing attempt — if DB lacks a table we continue.
  const candidateTables = ["workspaces", "tenants", "organizations", "accounts", "customers", "teams"];
  const candidateCols = ["clerk_org_id", "org_id", "orgId", "external_org_id", "external_id", "clerkId", "org"];
  for (const tbl of candidateTables) {
    for (const col of candidateCols) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tbl)
          .select("*")
          .eq(col, orgId)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          // try to find any uuid-like property in the row
          for (const key of Object.keys(data)) {
            if (isUuid(String((data as any)[key]))) return String((data as any)[key]);
          }
        }
      } catch (err) {
        // table or column may not exist; ignore and continue
      }
    }
  }

  // 4) product_source_index signals search (best-effort)
  try {
    const { data, error } = await supabaseAdmin
      .from("product_source_index")
      .select("tenant_id")
      .contains("signals", { clerk_org_id: orgId })
      .limit(1)
      .maybeSingle();
    if (!error && data && data.tenant_id && isUuid(String(data.tenant_id))) return String(data.tenant_id);
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * Ensures an auto-mapping entry exists for the given orgId and returns the tenant uuid to use.
 * If no mapping exists, creates one using a generated uuid (crypto.randomUUID()).
 */
async function ensureAutoMapping(orgId: string) {
  if (!orgId) throw new Error("orgId required for auto mapping");

  // Try read again (race-safe)
  try {
    const { data } = await supabaseAdmin
      .from(AUTO_MAPPING_TABLE)
      .select("tenant_id")
      .eq("clerk_org_id", orgId)
      .limit(1)
      .maybeSingle();
    if (data && data.tenant_id && isUuid(String(data.tenant_id))) return String(data.tenant_id);
  } catch (err) {
    // if table missing we'll fail on insert below
  }

  // Create new mapping row with generated UUID
  const newTenantId = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : require("crypto").randomUUID();
  const payload = { clerk_org_id: orgId, tenant_id: newTenantId };
  try {
    const { error } = await supabaseAdmin.from(AUTO_MAPPING_TABLE).insert([payload]);
    if (error) {
      // If insert fails (e.g., table missing or constraints), throw so caller can decide
      throw error;
    }
    return newTenantId;
  } catch (err: any) {
    // Bubble a helpful error
    throw new Error(`Failed to create tenant mapping in ${AUTO_MAPPING_TABLE}: ${err?.message ?? String(err)}`);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const suppliedTenant = body?.tenant_id ?? body?.tenantId ?? null;

    // Try to find an existing tenant id
    let tenantId: string | null = null;
    try {
      tenantId = await findExistingTenant(suppliedTenant, orgId ?? null);
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
    }

    // If not found, create an auto mapping row in match_tenant_mappings and use it.
    if (!tenantId) {
      if (!orgId) {
        return NextResponse.json({ ok: false, error: "tenant_id missing and no orgId available from auth" }, { status: 400 });
      }
      try {
        tenantId = await ensureAutoMapping(orgId);
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
      }
    }

    // Now proceed to create job with the resolved tenantId
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const jobPayload: any = {
      tenant_id: tenantId,
      created_by: userId,
      status: "queued",
      source_type: body.source_type ?? "distributor_sheet",
      file_name: body.file_name ?? null,
      meta: body.meta ?? {},
      input_count: rows.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: job, error: jobErr } = await supabaseAdmin.from("match_url_jobs").insert([jobPayload]).select("*").maybeSingle();
    if (jobErr) {
      console.error("create job insert error:", jobErr);
      throw jobErr;
    }

    // insert rows (best-effort)
    const inserts: any[] = rows.map((r: any, i: number) => ({
      job_id: job.id,
      tenant_id: tenantId,
      row_id: r.row_id ?? String(i + 1),
      supplier_name: r.supplier_name ?? null,
      sku: r.sku ?? null,
      ndc_item_code: r.ndc_item_code ?? null,
      product_name: r.product_name ?? null,
      brand_name: r.brand_name ?? null,
      raw: r.raw ?? r,
      supplier_key: r.supplier_key ?? (r.supplier_name ? r.supplier_name.toString().toLowerCase().replace(/\s+/g, "_") : null),
      sku_norm: r.sku_norm ?? null,
      ndc_item_code_norm: r.ndc_item_code_norm ?? null,
      product_name_norm: r.product_name_norm ?? null
    }));

    if (inserts.length) {
      const { error: insErr } = await supabaseAdmin.from("match_url_job_rows").insert(inserts);
      if (insErr) {
        console.warn("insert rows error:", insErr);
      }
    }

    return NextResponse.json({ ok: true, job_id: job.id }, { status: 201 });
  } catch (err: any) {
    console.error("create job error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
