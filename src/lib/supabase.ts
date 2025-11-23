// Lazy Supabase client factory — avoids calling createClient at module import time.
// Replace any direct top-level createClient usage with getSupabaseClient().
import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Throw so callers can return a 500 / server-misconfigured response.
    throw new Error("Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  // Require here to delay module evaluation until runtime
  // (avoids importing/initializing at build-time when envs may be absent).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");

  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}
