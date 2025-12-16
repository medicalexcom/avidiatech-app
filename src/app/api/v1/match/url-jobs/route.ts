import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function isUuid(s?: string | null) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  try {
    const { userId, orgId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Accept explicit tenant_id if provided — but it must be a UUID.
    const suppliedTenant = body?.tenant_id ?? body?.tenantId ?? null;

    let tenantId: string | null = null;

    if (suppliedTenant) {
      if (!isUuid(suppliedTenant)) {
        // Helpful error: caller supplied a non-UUID tenant_id (e.g., Clerk org id).
        return NextResponse.json({
          ok: false,
          error: `Invalid tenant_id: expected a UUID but got "${String(suppliedTenant)}". Provide the tenant UUID (not a Clerk org id). If you intended to use the current workspace, please supply the tenant UUID or configure a mapping from your auth org to a tenant UUID on the server.`
        }, { status: 400 });
      }
      tenantId = suppliedTenant;
    } else {
      // No explicit tenant provided. We cannot safely use Clerk orgId (it is not a tenant UUID).
      return NextResponse.json({
        ok: false,
        error: `tenant_id missing. Please provide the tenant UUID in the request body (tenant_id). Clerk org id (${String(orgId)}) cannot be used directly as tenant_id.`
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
