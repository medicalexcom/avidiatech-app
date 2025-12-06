import { auth } from "@clerk/nextjs/server";

/**
 * Helper to get user role from Clerk session claims.
 * Returns: role string (owner|admin|user) - defaults to 'user'
 */
export function getUserRole(): string {
  try {
    const { sessionClaims } = await auth() as any;
    const role = sessionClaims?.publicMetadata?.role || sessionClaims?.claims?.role;
    return role ?? "user";
  } catch {
    return "user";
  }
}
