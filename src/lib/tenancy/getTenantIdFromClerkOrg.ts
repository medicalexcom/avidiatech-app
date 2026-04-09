import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolves (and if needed creates) a tenant UUID for a Clerk organization.
 *
 * - tenants.clerk_org_id (text) is the stable external identifier
 * - tenant_members records the calling user as a member
 */
export async function getOrCreateTenantIdFromClerkOrg(opts: {
  clerkOrgId: string;
  clerkUserId: string;
  tenantName?: string | null;
}): Promise<string> {
  const { clerkOrgId, clerkUserId, tenantName } = opts;

  if (!clerkOrgId) throw new Error("missing_org");
  if (!clerkUserId) throw new Error("missing_user");

  const supabase = getSupabaseAdmin();

  // 1) Look up existing tenant
  const existing = await supabase
    .from("tenants")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`tenant_lookup_failed:${existing.error.message}`);
  }

  let tenantId = existing.data?.id as string | undefined;

  // 2) Create tenant if missing
  if (!tenantId) {
    const created = await supabase
      .from("tenants")
      .insert({
        clerk_org_id: clerkOrgId,
        name: tenantName ?? null,
      })
      .select("id")
      .single();

    if (created.error) {
      throw new Error(`tenant_create_failed:${created.error.message}`);
    }
    tenantId = created.data.id as string;
  }

  // 3) Ensure membership row exists (idempotent upsert)
  const membership = await supabase.from("tenant_members").upsert(
    {
      tenant_id: tenantId,
      clerk_user_id: clerkUserId,
      role: "member",
    },
    { onConflict: "tenant_id,clerk_user_id" }
  );

  if (membership.error) {
    throw new Error(`tenant_membership_failed:${membership.error.message}`);
  }

  return tenantId;
}
