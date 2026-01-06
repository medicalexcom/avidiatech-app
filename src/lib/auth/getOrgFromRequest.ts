import { getOrgFromClerkSession, getClerkSession } from "./clerkServer";
import { createClient } from "@supabase/supabase-js";

/**
 * Resolve application org/tenant id for an incoming Request.
 *
 * Strategy:
 * 1) Try Clerk session -> preferred mapping helper (getOrgFromClerkSession).
 * 2) If Clerk returned a clerkOrgId, try to map it to an internal tenant via tenants.clerk_org_id.
 * 3) If no mapping, fallback to using the current Clerk userId and lookup team_members -> tenant_id.
 * 4) In non-production, use DEV_ORG_ID if set.
 *
 * NOTE: This function uses the SUPABASE_SERVICE_ROLE_KEY to perform server-side lookups.
 * Ensure you have the envs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in your runtime.
 */

export async function getOrgFromRequest(req: Request): Promise<string | null> {
  // 1) Try Clerk-first helper (may return internal tenant or clerk org id depending on implementation)
  try {
    const org = await getOrgFromClerkSession(req);
    if (org) return org;
  } catch {
    // ignore and fall through
  }

  // 2) Attempt to resolve via Supabase using Clerk session details
  try {
    const sess = await getClerkSession(req);
    if (!sess) {
      // No clerk session available; fallthrough to dev fallback
    } else {
      const { clerkOrgId, userId } = sess;

      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

        // 2a) If clerkOrgId exists, try to find a tenant row with that clerk org id
        if (clerkOrgId) {
          try {
            // Assumes tenants table has a clerk_org_id column; if not present this will return null
            const { data: t1 } = await supa.from("tenants").select("id").eq("clerk_org_id", clerkOrgId).limit(1).maybeSingle();
            if (t1 && (t1 as any).id) return String((t1 as any).id);
          } catch {
            // ignore mapping failure
          }
        }

        // 2b) Fallback: find the tenant(s) the user belongs to in team_members
        if (userId) {
          try {
            // Prefer most recently updated membership for this user
            const { data: tm } = await supa
              .from("team_members")
              .select("tenant_id, role, created_at, updated_at")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (tm && (tm as any).tenant_id) {
              return String((tm as any).tenant_id);
            }
          } catch {
            // ignore and continue to dev fallback
          }
        }
      }
    }
  } catch {
    // ignore any lookup errors and continue
  }

  // 3) Development fallback (only in non-production)
  const dev = process.env.DEV_ORG_ID;
  if (process.env.NODE_ENV !== "production" && dev) return dev;

  return null;
}
