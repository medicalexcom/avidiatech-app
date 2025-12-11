export function normalizeEmail(email?: string | null): string | undefined {
  if (!email) {
    return undefined;
  }
  const normalized = email.trim().toLowerCase();
  return normalized.length ? normalized : undefined;
}

export function getOwnerEmails(): string[] {
  const source = process.env.OWNER_EMAILS;
  if (!source) {
    return [];
  }
  return source
    .split(',')
    .map((email) => normalizeEmail(email) ?? '')
    .filter((email): email is string => Boolean(email));
}
