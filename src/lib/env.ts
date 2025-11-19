function readEnv(key: string): string | undefined {
  return process.env[key];
}

export function getSupabaseUrl(): string | undefined {
  return readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function getStripeSecretKey(): string | undefined {
  return readEnv('STRIPE_SECRET_KEY');
}

export function getClerkPublishableKey(): string | undefined {
  return readEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') || readEnv('CLERK_PUBLISHABLE_KEY');
}

export function getOwnerEmails(): string[] {
  const raw = readEnv('OWNER_EMAILS');
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
