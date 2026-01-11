"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecrets } from "@/lib/integrations/encryption";

/**
 * Very small connector sync:
 * - For provider 'bigcommerce' we fetch first N products and write to import_rows + update import_jobs.
 * - For other providers this is a stub: you should implement provider-specific fetch/transform logic.
 *
 * This function receives a supabase admin client (service role) so it can write DB records.
 */

export default async function processConnectorSync(supaAdmin: SupabaseClient, jobId: string, integration: any) {
  // decrypt secrets
  const secrets = integration.encrypted_secrets ? decryptSecrets(integration.encrypted_secrets) : {};
  const provider = integration.provider;

  if (provider === "bigcommerce") {
    const storeHash = integration.config?.store_hash;
    const token = secrets.access_token;
    if (!storeHash || !token) throw new Error("Missing BigCommerce credentials");

    // fetch first 500 products (paged fetch recommended)
    const res = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=100`, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`BigCommerce fetch failed: ${res.status} ${txt}`);
    }
    const json = await res.json();
    const rows = (json.data ?? json) as any[];

    // Map provider output to a simple row shape: keep raw provider object in data
    const inserts = rows.map((r: any, i: number) => ({
      job_id: jobId,
      row_number: i + 1,
      data: r,
      status: "success",
    }));

    if (inserts.length) {
      // chunk insert
      const chunk = 200;
      for (let i = 0; i < inserts.length; i += chunk) {
        const part = inserts.slice(i, i + chunk);
        const { error } = await supaAdmin.from("import_rows").insert(part);
        if (error) {
          throw error;
        }
      }
    }

    // update job
    await supaAdmin
      .from("import_jobs")
      .update({
        total_rows: rows.length,
        processed_rows: inserts.length,
        status: "complete",
        result_summary: { successes: inserts.length, failures: 0 },
      })
      .eq("id", jobId);
    return;
  }

  // Generic stub — mark job failed (so operator knows to implement provider)
  await supaAdmin.from("import_jobs").update({
    status: "failed",
    errors: JSON.stringify([`sync for provider ${provider} is not implemented`]),
  }).eq("id", jobId);

  throw new Error(`sync for provider ${provider} is not implemented`);
}
