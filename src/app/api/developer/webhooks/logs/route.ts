import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";

/**
 * GET /api/developer/webhooks/logs
 * Returns the last 50 webhook delivery attempts for the current tenant.
 * Response: { logs: [{ id, status, event, received_at, response_code }] }
 */
export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      userEmail,
    });

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("webhook_deliveries")
      .select("id, status, event, received_at, response_code")
      .eq("tenant_id", context.tenantId)
      .order("received_at", { ascending: false })
      .limit(50);

    if (error) {
      // If the table doesn't exist yet, return empty array gracefully
      if (error.code === "42P01") {
        return NextResponse.json({ logs: [] });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ logs: data || [] });
  } catch (err) {
    return handleRouteError(err);
  }
}
