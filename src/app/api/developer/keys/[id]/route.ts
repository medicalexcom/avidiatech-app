import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { HttpError } from "@/lib/errors";

/**
 * DELETE /api/developer/keys/[id]
 * Revoke an API key by ID. Only the owning tenant may revoke.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing key id" }, { status: 400 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      userEmail,
    });

    if (context.role !== "owner") {
      throw new HttpError(403, "Only owners can revoke API keys.");
    }

    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenantId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
