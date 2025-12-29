import { getUserFromClerkSession } from "./clerkServer";

/**
 * isOrgAdmin helper — checks whether the current session user is an admin for the org.
 *
 * Implementation notes:
 * - By default tries to call an existing helper getUserRole (if present) in src/lib/auth/getUserRole.ts.
 * - If that helper isn't present or your role model differs, adapt the lookup to query your DB (Supabase).
 */

export async function isOrgAdmin(req: Request, orgId: string): Promise<boolean> {
  const user = await getUserFromClerkSession(req);
  if (!user) return false;

  try {
    // Try to use existing helper if present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getUserRole } = require("./getUserRole");
    if (typeof getUserRole === "function") {
      const role = await getUserRole(user.id, orgId);
      return role === "admin" || role === "owner";
    }
  } catch (e) {
    // Fallback: perform a DB lookup in owners or tenants table if you prefer.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require("@supabase/supabase-js");
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
      const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

      const { data } = await supa.from("owners").select("role").eq("org_id", orgId).eq("user_id", user.id).single();
      const role = data?.role ?? null;
      return role === "admin" || role === "owner";
    } catch (_) {
      return false;
    }
  }

  return false;
}

export async function throwIfNotAdmin(req: Request, orgId: string) {
  const ok = await isOrgAdmin(req, orgId);
  if (!ok) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}
