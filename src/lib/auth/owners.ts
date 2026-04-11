// src/lib/auth/owners.ts

/**
 * Normalize email: trim + lowercase, no empty strings.
 */
export function normalizeEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return normalized.length ? normalized : undefined;
}

/**
 * Read OWNER_EMAILS from env and return normalized list.
 * Example env:
 *   OWNER_EMAILS=you@yourdomain.com,other@company.com
 */
export function getOwnerEmails(): string[] {
  const source = process.env.OWNER_EMAILS;
  if (!source) return [];
  return source
    .split(",")
    .map((email) => normalizeEmail(email) ?? "")
    .filter((email): email is string => Boolean(email));
}

/**
 * Check if a given email belongs to an owner (in OWNER_EMAILS).
 */
export function isOwnerEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const owners = getOwnerEmails();
  return owners.includes(normalized);
}
