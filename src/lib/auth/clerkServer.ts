import type { Request as NodeRequest } from "node-fetch";

/**
 * Clerk server helpers.
 *
 * Notes:
 * - Uses @clerk/nextjs/server on the server. No secrets are committed.
 * - Maps Clerk session -> app org id using tenancy helper if available.
 * - In production this is the canonical way to derive org_id from the authenticated session.
 *
 * TODO: If your Clerk org -> app tenant mapping differs, adjust mapClerkOrgToTenant() logic.
 */

export async function getClerkSession(req: Request) {
  try {
    // dynamic import to avoid bundler/build-time resolution errors in some environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerk = require("@clerk/nextjs/server");
    // getAuth can accept the request object in Next route handlers
    const { userId, sessionId, orgId } = clerk.getAuth?.(req) ?? clerk.getAuth?.(req as unknown as NodeRequest) ?? {};
    if (!userId) return null;

    // Try to return available basic info
    return { userId, sessionId, clerkOrgId: orgId ?? null };
  } catch (err) {
    // Clerk not configured / not available
    return null;
  }
}

/**
 * Map Clerk session -> application org id.
 * Attempt Clerk-first mapping; if you use a tenancy helper, call it here.
 */
export async function getOrgFromClerkSession(req: Request): Promise<string | null> {
  const sess = await getClerkSession(req);
  if (!sess) return null;

  // If your Clerk org id is directly your app org id, return it:
  if (sess.clerkOrgId) {
    // OPTIONAL: if you store Clerk org id in your org row, use it directly.
    return sess.clerkOrgId;
  }

  // Otherwise map Clerk user -> tenant/org via existing helper (if you have one)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tenancy = require("../tenancy/getTenantIdFromClerkOrg");
    if (tenancy && typeof tenancy.getTenantIdFromClerkOrg === "function") {
      const mapped = await tenancy.getTenantIdFromClerkOrg(sess.userId);
      if (mapped) return mapped;
    }
  } catch (e) {
    // ignore - fallback below
  }

  // No mapped org found
  return null;
}

export async function getUserFromClerkSession(req: Request) {
  const sess = await getClerkSession(req);
  if (!sess) return null;
  return { id: sess.userId };
}
