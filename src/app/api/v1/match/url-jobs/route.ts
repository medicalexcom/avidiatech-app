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
 * Resolve tenant UUID:
 * - if explicitTenant provided and valid UUID -> use it
 * - else, if orgId (from Clerk) present -> lookup mapping table for tenant UUID
 * - else return null
 */
async function resolveTenantUuid(explicitTenant?: string | null, orgId?: string | null) {
  if (explicitTenant) {
    if (isUuid(explicitTenant)) return explicitTenant;
    // invalid explicit tenant supplied
    throw new Error(`Invalid tenant_id: expected UUID but got "${explicitTenant}"`);
  }

  if (!orgId) return null;

  // Lookup mapping table for orgId -> tenant id
  try {
    // Use dynamic column selection in a safe way: select the id column only
    const sel = `${TENANT_MAPPING_ID_COLUMN}`;
    const { data, error } = await supabaseAdmin
      .from(TENANT_MAPPING_TABLE)
      .select(sel)
      .eq(TENANT_MAPPING_ORG_COLUMN, orgId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("tenant mapping lookup error:", error);
      return null;
    }
    if (!data || !data[TENANT_MAPPING_ID_COLUMN]) return null;

    const candidate = String(data[TENANT_MAPPING_ID_COLUMN]);
    if (!isUuid(candidate)) {
      console.warn(`mapped tenant id is not a uuid: ${candidate}`);
      return null;
    }
    return candidate;
  } catch (err) {
    console.error("resolveTenantUuid error:", err);
    return null;
  }
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
      // Helpful error for operators: explain mapping configuration
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
        // Log but don't fail the job creation
        console.warn("insert rows error:", insErr);
      }
    }

    return NextResponse.json({ ok: true, job_id: job.id }, { status: 201 });
  } catch (err: any) {
    console.error("create job error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
