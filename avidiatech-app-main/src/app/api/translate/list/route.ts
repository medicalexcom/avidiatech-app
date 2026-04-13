import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";

/**
 * GET /api/translate/list
 * Returns translated products for the current tenant.
 *
 * Response:
 * {
 *   products: Array<{
 *     id: string;
 *     source_url?: string;
 *     name?: string;
 *     created_at?: string;
 *     translated_languages?: string[];
 *     source_language?: string;
 *   }>
 * }
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

    // Query products that have at least one translation
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, source_url, name, created_at, source_language, translated_languages"
      )
      .eq("tenant_id", context.tenantId)
      .not("translated_languages", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      // If the column doesn't exist yet return empty list so UI doesn't break
      if (error.code === "42703" || error.code === "42P01") {
        return NextResponse.json({ products: [] });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ products: data || [] });
  } catch (err) {
    return handleRouteError(err);
  }
}
