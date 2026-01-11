import { getAuth } from "@clerk/nextjs/server";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";

/**
 * Resolve a tenant UUID for any server request that needs a tenant context.
 *
 * Priority:
 * 1) explicit requestedTenantId (only if it's a UUID string)
 * 2) Clerk orgId -> tenants table via getOrCreateTenantIdFromClerkOrg(...)
 *
 * Returns null if it cannot be resolved (caller decides strict vs non-strict).
 */
export async function resolveTenantIdForServerRequest(
  req: Request,
  opts: { requestedTenantId?: string | null; tenantNameHint?: string | null } = {}
): Promise<{ tenantId: string | null; clerkUserId: string | null; clerkOrgId: string | null }> {
  const { userId, orgId } = getAuth(req as any);

  const requested = (opts.requestedTenantId || "").trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested);

  if (requested && isUuid) {
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
