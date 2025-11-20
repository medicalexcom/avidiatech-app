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
 * 
 * In Next.js 16, Clerk's auth() properly handles the async nature of headers() and other dynamic APIs.
 */
export function auth() {
  if (!isClerkConfigured()) {
    // Return a Promise to maintain consistent async interface
    return Promise.resolve({
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
    });
  }
  
  // Return Clerk's auth() directly - it handles async headers() internally in Next.js 16
  return clerkAuth();
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

