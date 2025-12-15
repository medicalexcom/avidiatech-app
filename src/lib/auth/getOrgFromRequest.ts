/**
 * Lightweight org extraction helper for server routes.
 *
 * Behavior:
 * - If DEV_ORG_ID is set in env, return it (developer convenience).
 * - Otherwise looks for:
 *   - Authorization header starting with "Org " (e.g. "Org <org_id>") OR
 *   - cookie "org_id=<org>"
 *
 * TODO (production):
 * - Replace the fallback logic with Clerk (or your auth provider).
 * - Example: use `@clerk/nextjs/server` getAuth(req) and derive org membership server-side.
 *
 * Usage: const orgId = await getOrgFromRequest(req); if (!orgId) return 401
 */

export async function getOrgFromRequest(req: Request): Promise<string | null> {
  // 1) DEV override
  const dev = process.env.DEV_ORG_ID;
  if (dev) return dev;

  // 2) Authorization header "Org <orgId>" (temporary convenience)
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Org ")) {
    return auth.slice(4).trim() || null;
  }

  // 3) cookie org_id=...
  const cookie = req.headers.get("cookie") ?? "";
  if (cookie) {
    const m = cookie.match(/(?:^|;\s*)org_id=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }

  // No org found
  return null;
}
