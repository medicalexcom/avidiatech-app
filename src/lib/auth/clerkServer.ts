import type { Request as NodeRequest } from "node-fetch";

/**
 * Clerk server helpers.
 *
 * Canonical behavior:
 * - getClerkSession(req): returns basic Clerk identity from request.
 * - getOrgFromClerkSession(req): returns INTERNAL tenant UUID when resolvable.
 *   - If Clerk org id already looks like UUID, return as-is.
 *   - Otherwise map orgId -> tenant id via tenancy helper.
 */

function looksLikeUuid(v?: string | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function getClerkSession(req: Request) {
  try {
    // dynamic import to avoid bundler/build-time resolution errors in some environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerk = require("@clerk/nextjs/server");
    // getAuth can accept the request object in Next route handlers
    const { userId, sessionId, orgId } =
      clerk.getAuth?.(req) ?? clerk.getAuth?.(req as unknown as NodeRequest) ?? {};
    if (!userId) return null;

    return { userId, sessionId, clerkOrgId: orgId ?? null };
  } catch {
    // Clerk not configured / not available
    return null;
  }
}

/**
 * Map Clerk session -> application tenant id (UUID).
 */
export async function getOrgFromClerkSession(req: Request): Promise<string | null> {
  const sess = await getClerkSession(req);
  if (!sess) return null;

  // If your Clerk org id is already the internal tenant UUID, return it directly.
  if (looksLikeUuid(sess.clerkOrgId)) {
    return sess.clerkOrgId as string;
  }

  // Map Clerk org id -> tenant id.
  if (sess.clerkOrgId && sess.userId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tenancy = require("../tenancy/getTenantIdFromClerkOrg");
      const mapper = tenancy?.getOrCreateTenantIdFromClerkOrg;
      if (typeof mapper === "function") {
        const mapped = await mapper({
          clerkOrgId: String(sess.clerkOrgId),
          clerkUserId: String(sess.userId),
        });
        if (looksLikeUuid(mapped)) return mapped;
      }
    } catch {
      // ignore mapping failure and fall through to null
    }
  }

  return null;
}

export async function getUserFromClerkSession(req: Request) {
  const sess = await getClerkSession(req);
  if (!sess) return null;
  return { id: sess.userId };
}
