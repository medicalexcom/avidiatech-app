// Lazy Supabase client factory helpers for server-side use.
// Exports:
//   - getServiceSupabaseClient(): Supabase client using SUPABASE_SERVICE_ROLE_KEY (required)
//   - getSupabaseClient(): convenience client - uses service key if available, otherwise anon key
//
// These functions intentionally require() @supabase/supabase-js at runtime
// to avoid evaluating during build-time when server envs may not be present.

import type { SupabaseClient } from "@supabase/supabase-js";

let _serviceClient: SupabaseClient | null = null;
let _anyClient: SupabaseClient | null = null;

function requireCreateClient() {
  // require inside function to delay module evaluation to runtime
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  return createClient;
}

/**
 * Returns a Supabase client using the SERVICE ROLE key.
 * Throws if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.
 *
 * Notes:
 * - We pass auth.persistSession=false to avoid session persistence in server contexts.
 * - We hint the client to use the global fetch (Node 18+ / Edge) when available.
 */
export function getServiceSupabaseClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase configuration for service client: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  const createClient = requireCreateClient();

  // Provide lightweight options suitable for server runtime:
  // - don't persist sessions in server environment
  // - prefer the global fetch implementation when available (Node 18+ / Edge)
  const options: Record<string, any> = {
    auth: { persistSession: false },
  };
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).fetch === "function") {
    options.global = { fetch: (globalThis as any).fetch };
  }

  _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, options);
  return _serviceClient;
}

/**
 * Convenience getter: prefer service-role key if present, otherwise use anon key.
 * Useful for code that can work with either client.
 *
 * Throws when SUPABASE_URL is missing or no usable key is present.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_anyClient) return _anyClient;

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!SUPABASE_URL) {
    throw new Error("Missing Supabase configuration: SUPABASE_URL is required");
  }

  const keyToUse = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!keyToUse) {
    throw new Error("Missing Supabase key: set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
  }

  const createClient = requireCreateClient();

  const options: Record<string, any> = {
    auth: { persistSession: false },
  };
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).fetch === "function") {
    options.global = { fetch: (globalThis as any).fetch };
  }

  _anyClient = createClient(SUPABASE_URL, keyToUse, options);
  return _anyClient;
}
