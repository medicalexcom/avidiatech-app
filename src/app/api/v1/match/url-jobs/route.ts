import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const TENANT_MAPPING_TABLE = process.env.TENANT_MAPPING_TABLE ?? "tenants";
const TENANT_MAPPING_ORG_COLUMN = process.env.TENANT_MAPPING_ORG_COLUMN ?? "clerk_org_id";
const TENANT_MAPPING_ID_COLUMN = process.env.TENANT_MAPPING_ID_COLUMN ?? "id";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function isUuid(s?: string | null) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Try to resolve tenant uuid using several heuristics:
 * 1) If explicitTenant provided and valid UUID -> use it
 * 2) If configured TENANT_MAPPING_TABLE is present -> lookup there using TENANT_MAPPING_ORG_COLUMN
 * 3) Try common table/column names (workspaces, tenants, organizations, accounts, customers)
 *    and common org id column names (clerk_org_id, org_id, external_org_id, external_id).
 *
 * Each DB lookup is attempted safely (caught). Returns the first valid UUID or null.
 */
async function resolveTenantUuid(explicitTenant?: string | null, orgId?: string | null) {
  if (explicitTenant) {
    if (isUuid(explicitTenant)) return explicitTenant;
    throw new Error(`Invalid tenant_id: expected UUID but got "${explicitTenant}"`);
  }

  if (!orgId) return null;

  // 1) Try configured mapping table first (if present)
  try {
    const sel = `${TENANT_MAPPING_ID_COLUMN}`;
    const { data, error } = await supabaseAdmin
      .from(TENANT_MAPPING_TABLE)
      .select(sel)
      .eq(TENANT_MAPPING_ORG_COLUMN, orgId)
      .limit(1)
      .maybeSingle();

    if (!error && data && data[TENANT_MAPPING_ID_COLUMN]) {
      const candidate = String(data[TENANT_MAPPING_ID_COLUMN]);
      if (isUuid(candidate)) return candidate;
    }
  } catch (err) {
    // Ignore and continue to fallback heuristics
    console.warn("tenant mapping lookup failed for configured mapping table:", err);
  }

  // 2) Try common table/column combinations
  const candidateTables = ["workspaces", "tenants", "organizations", "accounts", "customers", "teams"];
  const candidateCols = ["clerk_org_id", "org_id", "orgId", "external_org_id", "external_id", "clerkId"];

  for (const tbl of candidateTables) {
    for (const col of candidateCols) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tbl)
          .select("*") // we only need to read the id column below, keep generic
          .eq(col, orgId)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          // Try to deduce an id field
          const possibleId = data.id ?? data[`${tbl.slice(0, -1)}_id`] ?? data.tenant_id ?? data.uuid ?? null;
          if (possibleId && isUuid(String(possibleId))) return String(possibleId);
          // also check common key by name
          if (data[TENANT_MAPPING_ID_COLUMN] && isUuid(String(data[TENANT_MAPPING_ID_COLUMN]))) return String(data[TENANT_MAPPING_ID_COLUMN]);
          // fallback: any uuid-looking property
          for (const key of Object.keys(data)) {
            if (isUuid(String(data[key]))) return String(data[key]);
          }
        }
      } catch (err) {
        // Column or table may not exist — ignore and continue
        // console.warn(`lookup ${tbl}.${col} failed:`, err?.message ?? err);
      }
    }
  }

  // 3) As a last-ditch attempt, try to find a tenant by searching product_source_index.signals JSON
  //    for the orgId (useful if you injected orgId into signals previously).
  try {
    // PostgREST contains operator: use .contains for JSON matching
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

export async function POST(req: Request) {
  try {
    const { userId, orgId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Allow explicit tenant_id (must be a UUID)
    const suppliedTenant = body?.tenant_id ?? body?.tenantId ?? null;

    let tenantId: string | null = null;
    try {
      tenantId = await resolveTenantUuid(suppliedTenant, orgId ?? null);
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({
        ok: false,
        error: `tenant_id missing and automatic mapping failed. Provide tenant_id (UUID) in the request body, or configure tenant mapping environment variables. Expected mapping table "${TENANT_MAPPING_TABLE}" with org column "${TENANT_MAPPING_ORG_COLUMN}" and id column "${TENANT_MAPPING_ID_COLUMN}". Clerk org id: "${String(orgId)}".`
      }, { status: 400 });
    }

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

    // insert rows (normalize on client) — best-effort insert, swallow errors for individual rows
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
