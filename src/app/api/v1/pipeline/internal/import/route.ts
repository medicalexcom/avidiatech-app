// src/app/api/v1/pipeline/internal/import/route.ts
import { NextResponse } from "next/server";
import { runImportForIngestion } from "@/lib/imports/runImportForIngestion";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Resolve tenant_id from product_ingestions for an ingestionId.
 * Returns null if not found or on error.
 */
async function resolveTenantFromIngestion(ingestionId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from("product_ingestions")
      .select("tenant_id, org_id")
      .eq("id", ingestionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("resolveTenantFromIngestion: db error", error);
      return null;
    }
    if (!data) return null;
    return data.tenant_id ?? data.org_id ?? null;
  } catch (e) {
    console.warn("resolveTenantFromIngestion: unexpected error", String(e));
    return null;
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";
  const options = body?.options ?? {};

  if (!ingestionId) {
    return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });
  }

  try {
    const platform = (options?.platform ?? "bigcommerce") as "bigcommerce";
    const allowOverwriteExisting = Boolean(options?.allowOverwriteExisting);

    // 1) respect tenant included in request body if present
    let tenantId = body?.tenantId ?? body?.tenant_id ?? null;

    // 2) if tenantId missing, attempt to resolve from product_ingestions
    if (!tenantId) {
      const resolved = await resolveTenantFromIngestion(ingestionId);
      if (resolved) {
        tenantId = resolved;
      }
    }

    // 3) Call the import executor. We pass tenantId if resolved; runImportForIngestion
    //    implementations that don't accept tenantId should ignore extra props.
    const result = await runImportForIngestion({
      ingestionId,
      platform,
      allowOverwriteExisting,
      tenantId, // added fallback param (non-breaking)
      options,
    } as any);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || String(err);

    if (msg === "ingestion_not_found")
      return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });
    if (msg === "ingestion_not_ready")
      return NextResponse.json({ error: "ingestion_not_ready" }, { status: 409 });
    if (msg === "missing_tenant_id_for_import")
      return NextResponse.json({ error: "missing_tenant_id_for_import" }, { status: 422 });

    if (msg === "connection_not_found")
      return NextResponse.json({ error: "connection_not_found" }, { status: 409 });
    if (msg.startsWith("connection_load_failed:"))
      return NextResponse.json({ error: "connection_load_failed", detail: msg }, { status: 500 });

    if (msg === "bigcommerce_connection_incomplete")
      return NextResponse.json({ error: "bigcommerce_connection_incomplete" }, { status: 409 });

    if (msg.startsWith("bigcommerce_"))
      return NextResponse.json({ error: "bigcommerce_error", detail: msg }, { status: 502 });

    if (msg.startsWith("import_persist_failed:"))
      return NextResponse.json({ error: "import_persist_failed", detail: msg }, { status: 500 });

    return NextResponse.json({ error: "import_internal_failed", detail: msg }, { status: 500 });
  }
}
