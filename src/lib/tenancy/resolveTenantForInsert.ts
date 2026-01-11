import { getAuth } from "@clerk/nextjs/server";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";

/**
 * resolveTenantForInsert
 *
 * Canonical, strict tenant resolution for any code path that is about to create
 * a row in product_ingestions that will later be used by connectors/import.
 *
 * Resolution order:
 *  1) explicit tenantId passed in opts (e.g. internal calls, worker payload)
 *  2) Clerk org from request auth (orgId) -> tenants.id (create if needed)
 *
 * If strict=true and no tenant can be resolved, throws.
 */
export async function resolveTenantForInsert(opts: {
  req?: Request;
  explicitTenantId?: string | null;
  strict?: boolean;
}): Promise<string | null> {
  const strict = opts.strict !== false;

  // 1) explicit
  if (opts.explicitTenantId && typeof opts.explicitTenantId === "string") {
    const t = opts.explicitTenantId.trim();
    if (t) return t;
  }

  // 2) Clerk org -> tenant uuid
  // getAuth(req) works in Next route handlers; if req missing, we cannot derive org context
  if (opts.req) {
    try {
      const { userId, orgId } = getAuth(opts.req as any) as any;
      if (userId && orgId) {
        // Create or resolve a real UUID tenant for this org
        const tenantId = await getOrCreateTenantIdFromClerkOrg({
          clerkOrgId: String(orgId),
          clerkUserId: String(userId),
          tenantName: null,
        });
        if (tenantId) return tenantId;
      }
    } catch {
      // ignore; handled below
    }
  }

  if (strict) {
    throw new Error("missing_tenant_id_for_insert");
  }
  return null;
}
