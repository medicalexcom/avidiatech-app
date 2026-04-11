import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit/logAction";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/webhooks/bigcommerce
 * A simple receiver for BigCommerce webhooks. Validates the signature if integration secret is present.
 *
 * Expected payload: BigCommerce webhook payload. We record an audit entry and create an import_job or enqueue a sync as needed.
 *
 * NOTE: This endpoint is intentionally permissive in the skeleton. For production:
 * - Validate HMAC signature using integration secret
 * - Verify webhook type, and map to integration/org (storeHash)
 */


export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload) return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });

    // Example: payload may contain store_hash or store id. Try to find integration using store hash in config
    const storeHash = payload?.store_hash ?? payload?.storeHash ?? null;

    // If storeHash found, lookup integration
    let integration: any = null;
    if (storeHash) {
      const { data } = await getServerSupabase().from("integrations").select("*").like("config", `%${storeHash}%`).limit(1).single();
      integration = data ?? null;
    }

    // Create an audit log for the webhook
    await logAction(null, { orgId: integration?.org_id ?? null, action: "bigcommerce_webhook_received", resource: "webhook", resourceId: null, meta: { payload } });

    // If integration found, optionally create import_jobs or enqueue sync
    if (integration) {
      const { data: jobRow } = await getServerSupabase()
        .from("import_jobs")
        .insert({
          org_id: integration.org_id,
          status: "queued",
          source_type: "webhook",
          connector_id: integration.id,
          meta: { webhook: payload },
        })
        .select("*")
        .single();

      // enqueue connector-sync job for this integration if you prefer to process webhook-triggered syncs centrally
      const { getQueue } = require("@/lib/queue/bull");
      const queue = getQueue("connector-sync");
      await queue.add("connector-sync", { integrationId: integration.id, jobId: jobRow.id }, { attempts: 3 });

      return NextResponse.json({ ok: true, queued: true });
    }

    return NextResponse.json({ ok: true, message: "webhook received" });
  } catch (err: any) {
    console.error("bigcommerce webhook error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
