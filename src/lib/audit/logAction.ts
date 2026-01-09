import { createClient } from "@supabase/supabase-js";
import { getUserFromClerkSession } from "@/lib/auth/clerkServer";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for audit logging");
}
const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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
    await supaAdmin.from("audit_logs").insert(row);
  } catch (err) {
    // Do not throw — audit failure should not block user actions
    // Log to console for visibility
    // eslint-disable-next-line no-console
    console.warn("audit log failed", err);
  }
}
