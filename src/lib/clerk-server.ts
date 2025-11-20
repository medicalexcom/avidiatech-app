import { auth as clerkAuth, clerkClient as originalClerkClient } from '@clerk/nextjs/server';

/**
 * Check if Clerk is properly configured with required environment variables
 */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
    process.env.CLERK_PUBLISHABLE_KEY
  );
}

/**
 * Wrapper around Clerk's auth() that returns null values when Clerk is not configured
 * instead of throwing an error. Must be awaited in async server components.
 */
export async function auth() {
  if (!isClerkConfigured()) {
    return {
      userId: null,
      sessionId: null,
      sessionClaims: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      orgPermissions: null,
      protect: () => {
        throw new Error('Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.');
      },
    };
  }
  
  return await clerkAuth();
}

/**
 * Wrapper around Clerk's clerkClient that throws helpful errors when Clerk is not configured
 */
export const clerkClient = new Proxy(originalClerkClient, {
  get(target, prop) {
    if (!isClerkConfigured()) {
      throw new Error('Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable Clerk client operations.');
    }
    return target[prop as keyof typeof target];
  }
});

