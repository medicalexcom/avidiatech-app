import { getUserFromClerkSession } from "@/lib/auth/clerkServer";
import { getServerSupabase } from "@/lib/supabase";

/**
 * logAction - write audit entry to audit_logs
 * action: short string describing action e.g. "create_integration", "trigger_sync", "create_import"
 * resource: e.g. "integration", "import_job"
 * resourceId: uuid of resource (optional)
 * meta: arbitrary JSON with contextual data
 */
export async function logAction(req: Request | null, params: { orgId?: string; action: string; resource?: string; resourceId?: string | null; meta?: any }) {
  try {
    const user = req ? await getUserFromClerkSession(req) : null;
    const row = {
      org_id: params.orgId ?? null,
      user_id: user?.id ?? null,
      action: params.action,
      resource: params.resource ?? null,
      resource_id: params.resourceId ?? null,
      meta: params.meta ?? null,
      created_at: new Date().toISOString(),
    };
    await getServerSupabase().from("audit_logs").insert(row);
  } catch (err) {
    // Do not throw — audit failure should not block user actions
    // Log to console for visibility
    // eslint-disable-next-line no-console
    console.warn("audit log failed", err);
  }
}
