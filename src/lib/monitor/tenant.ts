import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";
import { getOrCreateTenantIdFromClerkOrg } from "@/lib/tenancy/getTenantIdFromClerkOrg";

function isUuid(s?: string) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Resolve tenant id for authenticated user.
 * - Prefers Clerk org mapping if available
 * - Falls back to profiles.clerk_user_id -> tenant_id
 */
export async function requireTenantFromRequest(req: Request): Promise<{ tenantId: string; userId: string }> {
  const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
  if (!userId) throw new Error("unauthenticated");

  // DEV shortcut (your repo uses this pattern elsewhere)
  if (process.env.NODE_ENV === "development" && process.env.DEV_ORG_ID) {
    return { tenantId: process.env.DEV_ORG_ID, userId };
  }

  // Try Clerk org id via Clerk getAuth (if available)
  let clerkOrgId: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerk = require("@clerk/nextjs/server");
    const auth = clerk.getAuth?.(req as any) ?? {};
    clerkOrgId = auth?.orgId ?? null;
  } catch {
    clerkOrgId = null;
  }

  if (clerkOrgId) {
    const tenantId = await getOrCreateTenantIdFromClerkOrg({
      clerkOrgId,
      clerkUserId: userId,
      tenantName: null,
    });
    return { tenantId, userId };
  }

  // Fallback: profiles lookup
  const supabase = getServerSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("clerk_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`tenant_lookup_failed:${error.message}`);
  const tid = profile?.tenant_id ? String(profile.tenant_id) : "";
  if (!tid || !isUuid(tid)) throw new Error("tenant_resolution_failed");
  return { tenantId: tid, userId };
}
