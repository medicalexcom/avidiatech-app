import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * NOTE: This file augments the existing minimal supabase client helper while preserving
 * the original `supabase` export and behavior so other modules keep working.
 *
 * - Existing code (kept): supabase (created using SERVICE_ROLE_KEY || ANON_KEY if present)
 * - Additions:
 *   - getServerSupabase(): returns a server client using SUPABASE_SERVICE_ROLE_KEY (throws if missing)
 *   - getBrowserSupabase(): returns a browser/anon client using NEXT_PUBLIC_* anon key (returns null if missing)
 *   - serverSupabase / browserSupabase: convenience memoized clients (or null)
 */

/* --- existing vars (kept for compatibility) --- */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;
if (url && key) {
  _supabase = createClient(url, key);
} else {
  console.warn("Supabase client not configured (missing SUPABASE_URL or KEY). Some server operations will fail until configured.");
}

export const supabase = _supabase;

/* --- new, non-breaking helpers --- */
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Memoized server client using the service role key (bypasses RLS).
 * Use this in server-only code paths that need elevated privileges.
 */
let _serverSupabase: SupabaseClient | null = null;
export function getServerSupabase(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error("Server Supabase client is not configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in the environment.");
  }
  if (!_serverSupabase) {
    _serverSupabase = createClient(url, serviceRoleKey, {
      // Add server-specific options here if needed
    });
  }
  return _serverSupabase;
}

/**
 * Memoized browser/anon client. Safe to call from client code if NEXT_PUBLIC_* vars are configured.
 * Returns null when anon config is missing (caller should handle null).
 */
let _browserSupabase: SupabaseClient | null = null;
export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !anonKey) {
    if (typeof window === "undefined") {
      // server-side: warn but do not throw
      console.warn("Browser Supabase client not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    }
    return null;
  }
  if (!_browserSupabase) {
    _browserSupabase = createClient(url, anonKey, {
      // client options if needed
    });
  }
  return _browserSupabase;
}

/**
 * Convenience exports that create clients if possible (null when missing).
 * These are provided for callers that prefer a value rather than calling the getters.
 */
export const serverSupabase: SupabaseClient | null = (url && serviceRoleKey) ? createClient(url, serviceRoleKey) : null;
export const browserSupabase: SupabaseClient | null = (url && anonKey) ? createClient(url, anonKey) : null;

// --- append / add these exports for backward-compatibility ----

// If the module already exports getServerSupabase (suggested by the build error),
// provide a compatibility alias so older imports using getServiceSupabaseClient still work.
//
// Note: we intentionally don't create a new client here; we alias an existing server helper.
// If your module uses a different name, adjust the alias to match the exported helper.

export { getServerSupabase as getServiceSupabaseClient } from "./supabase";

/* --- Compatibility alias for callers expecting getServiceSupabaseClient --- */
/* We import the module namespace and then export a runtime alias for common server helper names.
   This avoids referencing an identifier that might not exist and is safe at build-time. */

import * as _supabase from "./supabase";

// Try common names that other modules might expect; prefer existing exact alias if present.
export const getServiceSupabaseClient =
  (_supabase as any).getServiceSupabaseClient ??
  (_supabase as any).getServerSupabase ??
  (_supabase as any).getServerClient ??
  (_supabase as any).getServiceClient ??
  undefined;
