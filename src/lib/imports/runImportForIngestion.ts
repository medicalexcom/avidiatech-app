import { getServiceSupabaseClient } from "@/lib/supabase";
import { getActiveConnectionForTenant } from "@/lib/ecommerce/connections";
import { importToBigCommerce } from "@/lib/ecommerce/connectors/bigcommerce";

export async function runImportForIngestion(args: {
  ingestionId: string;
  platform?: "bigcommerce";
  allowOverwriteExisting?: boolean;
}) {
  const supabase = getServiceSupabaseClient();

  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select("id, tenant_id, source_url, normalized_payload, seo_payload, description_html, diagnostics")
    .eq("id", args.ingestionId)
    .maybeSingle();

  if (loadErr) throw new Error(`ingestion_load_failed: ${loadErr.message}`);
  if (!ingestion) throw new Error("ingestion_not_found");
  if (!ingestion.tenant_id) throw new Error("missing_tenant_id_for_import");
  if (!ingestion.normalized_payload) throw new Error("ingestion_not_ready");

  const tenantId = String(ingestion.tenant_id);
  const platform = args.platform ?? "bigcommerce";

  const startedAt = new Date().toISOString();

  const conn = await getActiveConnectionForTenant({ tenantId, platform });

  const storeHash = String((conn.config as any)?.store_hash ?? (conn.secrets as any)?.store_hash ?? "");
  const token = String((conn.secrets as any)?.access_token ?? "");
  if (!storeHash || !token) throw new Error("bigcommerce_connection_incomplete");

  const result = await importToBigCommerce({
    creds: { store_hash: storeHash, access_token: token },
    ingestionRow: ingestion,
    opts: { allowOverwriteExisting: Boolean(args.allowOverwriteExisting) },
  });

  const finishedAt = new Date().toISOString();

  const diagnostics = ingestion.diagnostics || {};
  const importDiagnostics = {
    ...(diagnostics.import || {}),
    status: result.ok ? "completed" : "failed",
    started_at: startedAt,
    last_run_at: finishedAt,
    platform,
    result,
  };

  const updatedDiagnostics = { ...diagnostics, import: importDiagnostics };

  const { error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      diagnostics: updatedDiagnostics,
      updated_at: finishedAt,
    })
    .eq("id", ingestion.id);

  if (updErr) throw new Error(`import_persist_failed: ${updErr.message}`);

  return {
    ingestionId: ingestion.id,
    platform,
    result,
  };
}
