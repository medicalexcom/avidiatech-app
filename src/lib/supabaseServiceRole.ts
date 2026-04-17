import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase";

function resolveClient(): SupabaseClient {
  return getServerSupabase();
}

/**
 * Lazy service-role client proxy.
 *
 * This preserves the existing `supabaseServiceRole.from(... )` calling style used by
 * the newer profile-management files without forcing eager client creation at module load.
 */
export const supabaseServiceRole = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = resolveClient() as any;
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as SupabaseClient;

export default supabaseServiceRole;
