// src/lib/auth/isOrgAdmin.ts
//
// Improved isOrgAdmin helper:
// - Attempts several strategies to determine whether the session user is an admin/owner for the given orgId:
//   1) If a custom getUserRole helper exists, call it (supports both zero-arg and two-arg signatures).
//   2) Lookup team_members table (tenant_id / user_id) which is used by the app.
//   3) Fallback to owners table as a legacy option.
// - Returns boolean and keeps throwIfNotAdmin for existing callers.
//
// This change addresses cases where Clerk session org mapping (clerkOrgId) does not equal the app tenant id
// and where admin/owner membership is recorded in team_members rather than owners.

import { getUserFromClerkSession } from "./clerkServer";
import { createClient } from "@supabase/supabase-js";

export async function isOrgAdmin(req: Request, orgId: string): Promise<boolean> {
  const user = await getUserFromClerkSession(req);
  if (!user) return false;

  // 1) Try custom getUserRole helper if present. Support both shapes:
  //    - function getUserRole(userId, orgId) -> role
  //    - function getUserRole() -> role (uses server auth)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("./getUserRole");
    const getUserRole = mod?.getUserRole ?? mod?.default ?? mod;
    if (typeof getUserRole === "function") {
      try {
        // Try calling with (userId, orgId) first
        const maybeRole = await Promise.resolve(getUserRole(user.id, orgId));
        const role = typeof maybeRole === "string" ? maybeRole : null;
        if (role) {
          return role === "admin" || role === "owner";
        }
      } catch {
        // If the function expects no args, try calling without args
        try {
          const maybeRole2 = await Promise.resolve(getUserRole());
          const role2 = typeof maybeRole2 === "string" ? maybeRole2 : null;
          if (role2) {
            return role2 === "admin" || role2 === "owner";
          }
        } catch {
          // ignore and fall through to DB checks
        }
      }
    }
  } catch {
    // ignore missing helper
  }

  // 2) Fallback: check team_members table (preferred for this app)
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      // Try team_members first (tenant_id is used for org/tenant)
      try {
        const { data: tmData, error: tmErr } = await supa
          .from("team_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("tenant_id", orgId)
          .limit(1)
          .maybeSingle();

        if (!tmErr && tmData) {
          const role = (tmData as any).role ?? null;
          return role === "admin" || role === "owner";
        }
      } catch {
        // ignore and try owners table next
      }

      // 3) Legacy fallback: owners table (some installs may use this)
      try {
        const { data: ownersData, error: ownersErr } = await supa
          .from("owners")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!ownersErr && ownersData) {
          const role = (ownersData as any).role ?? null;
          return role === "admin" || role === "owner";
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore DB fallback errors
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
