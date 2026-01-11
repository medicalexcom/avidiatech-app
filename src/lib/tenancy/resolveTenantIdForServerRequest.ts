import { getAuth } from "@clerk/nextjs/server";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Resolve a tenant UUID for server-side handlers that need tenant context.
 *
 * Priority:
 * 1) Explicit requestedTenantId (if valid UUID)
 * 2) Clerk orgId -> tenants.id via getOrCreateTenantIdFromClerkOrg
 *
 * Returns tenantId null when it cannot be resolved (caller chooses strict vs permissive).
 */
export async function resolveTenantIdForServerRequest(
  req: Request,
  opts: { requestedTenantId?: string | null; tenantNameHint?: string | null } = {}
): Promise<{ tenantId: string | null; clerkUserId: string | null; clerkOrgId: string | null }> {
  const { userId, orgId } = getAuth(req as any);

  const requested = String(opts.requestedTenantId ?? "").trim();
  if (requested && isUuid(requested)) {
    return { tenantId: requested, clerkUserId: userId ?? null, clerkOrgId: orgId ?? null };
  }

  if (!userId || !orgId) {
    return { tenantId: null, clerkUserId: userId ?? null, clerkOrgId: orgId ?? null };
  }

  const tenantId = await getOrCreateTenantIdFromClerkOrg({
    clerkOrgId: orgId,
    clerkUserId: userId,
    tenantName: opts.tenantNameHint ?? null,
  });

  return { tenantId: tenantId ?? null, clerkUserId: userId, clerkOrgId: orgId };
}
