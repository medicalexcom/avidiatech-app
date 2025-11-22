export function extractEmailFromSessionClaims(
  sessionClaims: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!sessionClaims) {
    return undefined;
  }

  const claims = sessionClaims as Record<string, unknown>;
  const keys = ['email', 'email_address'];
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  const addressList = claims['email_addresses'];
  if (Array.isArray(addressList)) {
    const first = addressList.find((value) => typeof value === 'string') as string | undefined;
    if (first) {
      return first;
    }
  }

  return undefined;
}
