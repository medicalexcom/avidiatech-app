import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { HttpError } from "@/lib/errors";

/**
 * POST /api/developer/webhooks
 * Register a new webhook endpoint for the current tenant.
 * Body: { url: string }
 */
export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      userEmail,
    });

    if (context.role !== "owner") {
      throw new HttpError(403, "Only owners can register webhook endpoints.");
    }

    const body = await request.json().catch(() => ({}));
    const { url } = body as { url?: string };
    if (!url?.startsWith("https://")) {
      return NextResponse.json(
        { error: "A valid HTTPS URL is required." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Upsert — one endpoint per tenant (extend schema for multiple if needed)
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .upsert(
        {
          tenant_id: context.tenantId,
          url,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      )
      .select("id, url, active, created_at");

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, endpoint: data?.[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * GET /api/developer/webhooks
 * List registered webhook endpoints for the current tenant.
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
      .from("webhook_endpoints")
      .select("id, url, active, created_at")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ endpoints: data || [] });
  } catch (err) {
    return handleRouteError(err);
  }
}
