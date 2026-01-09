// src/lib/auth/isOrgAdmin.ts
//
// Robust isOrgAdmin helper:
// - Tries a local getUserRole helper (if present) trying both (userId, orgId) and zero-arg signatures.
// - If the helper returns 'admin' or 'owner' -> returns true immediately.
// - Otherwise falls back to DB checks (team_members then owners) using Supabase service role.
// - Safe casting and defensive coding to avoid type errors.
//
// This version intentionally does NOT return false just because getUserRole returned a non-admin value;
// it will continue to check the database to find an explicit membership record.

import { getUserFromClerkSession } from "./clerkServer";
import { createClient } from "@supabase/supabase-js";

function looksLikeUuid(s?: string | null): boolean {
  if (!s) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export async function isOrgAdmin(req: Request, orgId: string): Promise<boolean> {
  const user = await getUserFromClerkSession(req);
  if (!user) return false;

  // 1) Try custom getUserRole helper if present. Support two call patterns:
  //    - getUserRole(userId, orgId)
  //    - getUserRole() (uses server auth)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("./getUserRole");
    const getUserRole = mod?.getUserRole ?? mod?.default ?? mod;
    if (typeof getUserRole === "function") {
      try {
        // prefer calling with (userId, orgId)
        const maybeRole = await Promise.resolve(getUserRole(user.id, orgId));
        if (typeof maybeRole === "string") {
          if (maybeRole === "admin" || maybeRole === "owner") return true;
          // if helper returns a non-admin role, we do NOT immediately return false;
          // instead continue to DB fallback to allow explicit DB membership to grant admin.
        }
      } catch {
        // If that failed, try calling without args
        try {
          const maybeRole2 = await Promise.resolve(getUserRole());
          if (typeof maybeRole2 === "string") {
            if (maybeRole2 === "admin" || maybeRole2 === "owner") return true;
            // continue to DB fallback
          }
        } catch {
          // ignore and fall through to DB checks
        }
      }
    }
  } catch {
    // missing helper or load failed — continue to DB checks
  }

  // 2) DB fallbacks using Supabase service role
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // cannot perform DB checks — return false conservatively
      return false;
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Prefer team_members table (tenant_id may be UUID)
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

      // If exact match by uuid didn't find, try casting tenant_id to text (handles text/uuid mismatches)
      const { data: tmData2, error: tmErr2 } = await supa
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .filter("tenant_id::text", "eq", String(orgId))
        .limit(1)
        .maybeSingle();

      if (!tmErr2 && tmData2) {
        const role = (tmData2 as any).role ?? null;
        return role === "admin" || role === "owner";
      }
    } catch {
      // ignore and try owners fallback
    }

    // Legacy owners table fallback
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

      // also try org_id casted to text
      const { data: ownersData2, error: ownersErr2 } = await supa
        .from("owners")
        .select("role")
        .filter("org_id::text", "eq", String(orgId))
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!ownersErr2 && ownersData2) {
        const role = (ownersData2 as any).role ?? null;
        return role === "admin" || role === "owner";
      }
    } catch {
      // ignore
    }
  } catch {
    // DB lookups failed: conservative false
    return false;
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
