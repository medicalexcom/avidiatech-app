/**
 * Prefer Clerk session -> map to org.
 * Only fall back to DEV_ORG_ID in non-production for local testing convenience.
 *
 * IMPORTANT: In production this must NOT use DEV_ORG_ID.
 */

import { getOrgFromClerkSession } from "./clerkServer";

export async function getOrgFromRequest(req: Request): Promise<string | null> {
  // Try Clerk session first
  try {
    const org = await getOrgFromClerkSession(req);
    if (org) return org;
  } catch (err) {
    // ignore and fall through to dev fallback if allowed
  }

  // Development fallback (only enable explicitly in non-production)
  const dev = process.env.DEV_ORG_ID;
  if (process.env.NODE_ENV !== "production" && dev) return dev;

  return null;
}
