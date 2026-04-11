import { getOrgFromClerkSession, getClerkSession } from "./clerkServer";
import { createClient } from "@supabase/supabase-js";

/**
 * Resolve application org/tenant id for an incoming Request.
 *
 * Strategy:
 * 1) Try getOrgFromClerkSession() — if it returns a UUID (your tenant id), return it.
 * 2) If it returns a Clerk org id (e.g. 'org_...'), attempt to map it to tenants.id by tenants.clerk_org_id.
 * 3) If no mapping found, attempt to find a tenant_id via team_members for the Clerk userId.
 * 4) Dev fallback: DEV_ORG_ID (only non-production).
 *
 * This avoids returning a raw Clerk id (org_...) directly to callers that expect a UUID.
 */

function looksLikeUuid(s?: string | null): boolean {
  if (!s) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export async function getOrgFromRequest(req: Request): Promise<string | null> {
  // 1) Try Clerk-first helper (may return internal tenant or clerk org id depending on implementation)
  try {
    const maybe = await getOrgFromClerkSession(req);
    if (maybe) {
      // If helper already returns an internal UUID, return it
      if (looksLikeUuid(maybe)) return maybe;
      // If it's a Clerk org id (e.g. 'org_...'), fall through to mapping below
      // otherwise attempt mapping below too
    }
  } catch {
    // ignore and proceed to mapping attempts
  }

  // 2) Try to map using Supabase (service role)
  try {
    const sess = await getClerkSession(req);
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // can't perform DB lookups — fallthrough to dev fallback
    } else {
      const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

      // If Clerk helper gave a clerkOrgId via getClerkSession, try to use it
      if (sess?.clerkOrgId) {
        const clerkOrgId = String(sess.clerkOrgId);
        // find tenant where tenants.clerk_org_id == clerkOrgId
        try {
          const { data: t } = await supa.from("tenants").select("id").ilike("clerk_org_id", clerkOrgId).limit(1).maybeSingle();
          if (t && (t as any).id && looksLikeUuid((t as any).id)) return String((t as any).id);
        } catch {
          // ignore mapping failure
        }
      }

      // If session user present, try to find a tenant via team_members
      if (sess?.userId) {
        try {
          const { data: tm } = await supa
            .from("team_members")
            .select("tenant_id")
            .eq("user_id", sess.userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (tm && (tm as any).tenant_id && looksLikeUuid((tm as any).tenant_id)) return String((tm as any).tenant_id);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore DB lookup errors
  }

  // 3) Development fallback (only in non-production)
  const dev = process.env.DEV_ORG_ID;
  if (process.env.NODE_ENV !== "production" && dev) return dev;

  return null;
}
