/**
 * Minimal auth helpers for scaffold.
 * Replace with your real auth/session resolution.
 */

export async function getCurrentUser(req?: Request) {
  // In production, replace by session inspection (Clerk/Auth0/NextAuth)
  return { id: process.env.DEV_USER_ID || "00000000-0000-0000-0000-000000000000", email: "dev@example.com" };
}

export function getCurrentTenantId(req?: Request): string {
  // In production, resolve tenant id from session/JWT claims.
  return process.env.DEV_TENANT_ID || "00000000-0000-0000-0000-000000000000";
}
