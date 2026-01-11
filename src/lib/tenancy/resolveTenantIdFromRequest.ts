import type { RequestLike } from "./types";

/**
 * Resolve tenant_id from a server request.
 *
 * Supported sources (in priority order):
 * 1) Header: x-tenant-id
 * 2) Query string: ?tenant_id=... or ?tenantId=...
 * 3) JSON body fields: tenant_id / tenantId / org_id / orgId (best-effort)
 *
 * Notes:
 * - This does NOT validate UUID format (keeps it permissive); downstream DB may enforce.
 * - Returns null if no tenant found.
 */
export async function resolveTenantIdFromRequest(req: RequestLike): Promise<string | null> {
  try {
    // 1) Header
    const hdr =
      req.headers?.get?.("x-tenant-id") ||
      req.headers?.get?.("x-org-id") ||
      req.headers?.get?.("x-organization-id") ||
      "";
    if (hdr && typeof hdr === "string") return hdr.trim() || null;

    // 2) Query param
    const url = new URL(req.url);
    const q =
      url.searchParams.get("tenant_id") ||
      url.searchParams.get("tenantId") ||
      url.searchParams.get("org_id") ||
      url.searchParams.get("orgId");
    if (q) return q.trim() || null;

    // 3) JSON body (only if content-type is json and body not yet read)
    const ct = (req.headers?.get?.("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return null;

    // IMPORTANT: callers may have already consumed the body.
    // Only attempt if Request supports clone().
    const anyReq: any = req as any;
    if (typeof anyReq.clone !== "function") return null;

    const cloned = anyReq.clone() as Request;
    const body = (await cloned.json().catch(() => null)) as any;
    if (!body || typeof body !== "object") return null;

    const fromBody =
      body.tenant_id ??
      body.tenantId ??
      body.org_id ??
      body.orgId ??
      body.organization_id ??
      body.organizationId;

    if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();
    return null;
  } catch {
    return null;
  }
}
