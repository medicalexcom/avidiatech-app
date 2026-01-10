import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function isUuid(s?: string | null) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

const TENANT_MAPPING_TABLE = process.env.TENANT_MAPPING_TABLE ?? "tenants";
const TENANT_MAPPING_ORG_COLUMN = process.env.TENANT_MAPPING_ORG_COLUMN ?? "clerk_org_id";
const TENANT_MAPPING_ID_COLUMN = process.env.TENANT_MAPPING_ID_COLUMN ?? "id";

export async function GET(req: Request) {
  try {
    const { userId, orgId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const report: any = {
      orgId: orgId ?? null,
      configuredMapping: { table: TENANT_MAPPING_TABLE, orgColumn: TENANT_MAPPING_ORG_COLUMN, idColumn: TENANT_MAPPING_ID_COLUMN },
      attempts: []
    };

    if (!orgId) {
      report.error = "No orgId available from auth (getAuth).";
      return NextResponse.json(report, { status: 200 });
    }

    // 1) Try configured mapping table
    try {
      const sel = `${TENANT_MAPPING_ID_COLUMN}`;
      const { data, error } = await supabaseAdmin
        .from(TENANT_MAPPING_TABLE)
        .select(sel)
        .eq(TENANT_MAPPING_ORG_COLUMN, orgId)
        .limit(1)
        .maybeSingle();
      report.attempts.push({
        type: "configured_mapping",
        table: TENANT_MAPPING_TABLE,
        column: TENANT_MAPPING_ORG_COLUMN,
        idColumn: TENANT_MAPPING_ID_COLUMN,
        error: error ? (error.message ?? error) : null,
        found: !!data,
        row: data ?? null,
        rowIdIsUuid: data && data[TENANT_MAPPING_ID_COLUMN] ? isUuid(String(data[TENANT_MAPPING_ID_COLUMN])) : false
      });
    } catch (err:any) {
      report.attempts.push({ type: "configured_mapping", table: TENANT_MAPPING_TABLE, column: TENANT_MAPPING_ORG_COLUMN, error: String(err?.message ?? err) });
    }

    // 2) Try a list of common table/column combos
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
          report.attempts.push({
            type: "heuristic_lookup",
            table: tbl,
            column: col,
            error: error ? (error.message ?? error) : null,
            found: !!data,
            rowSample: data ?? null,
            possibleIdCandidates: data ? Object.entries(data).filter(([,v]) => typeof v === "string" && isUuid(String(v))).map(([k,v]) => ({ key: k, value: v })) : []
          });
        } catch (err:any) {
          // table/column not present or permission denied — record the error string
          report.attempts.push({ type: "heuristic_lookup", table: tbl, column: col, error: String(err?.message ?? err) });
        }
      }
    }

    // 3) Try product_source_index signals contains
    try {
      const { data, error } = await supabaseAdmin
        .from("product_source_index")
        .select("tenant_id, signals")
        .contains("signals", { clerk_org_id: orgId })
        .limit(1)
        .maybeSingle();
      report.attempts.push({
        type: "signals_search",
        table: "product_source_index",
        column: "signals",
        error: error ? (error.message ?? error) : null,
        found: !!data,
        row: data ?? null,
        tenantIdIsUuid: data && data.tenant_id ? isUuid(String(data.tenant_id)) : false
      });
    } catch (err:any) {
      report.attempts.push({ type: "signals_search", table: "product_source_index", error: String(err?.message ?? err) });
    }

    return NextResponse.json({ ok: true, report }, { status: 200 });
  } catch (err:any) {
    console.error("resolve-tenant debug error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
