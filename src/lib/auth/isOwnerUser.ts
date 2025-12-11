// src/lib/auth/isOwnerUser.ts
import { clerkClient } from "@clerk/nextjs/server";
import { isOwnerEmail, normalizeEmail, getOwnerEmails } from "./owners";

/**
 * Internal helper: safe read of OWNER_EMAILS (optional, defensive).
 */
function hasAnyOwnersConfigured(): boolean {
  const owners = getOwnerEmails();
  return owners.length > 0;
}

/**
 * Given a Clerk userId, return true if their email is in OWNER_EMAILS.
 */
export async function isOwnerUser(userId: string): Promise<boolean> {
  // If no owners configured, fast-fail to avoid unnecessary Clerk calls
  if (!hasAnyOwnersConfigured()) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  const email =
    normalizeEmail(user.primaryEmailAddress?.emailAddress) ||
    normalizeEmail(user.emailAddresses?.[0]?.emailAddress);

  if (!email) return false;

  return isOwnerEmail(email);
}
