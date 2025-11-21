import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Match all routes except static files and Next.js internals
export const config = {
  matcher: ['/((?!\\..*|_next).*)', '/api/(.*)'],
};

// Proxy function runs on every matched request
export async function proxy(req: NextRequest) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  // If Clerk keys are available, use Clerk middleware to protect non‑public routes
  if (publishableKey && secretKey) {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

    return clerkMiddleware((auth) => {
      if (!isPublicRoute(req)) {
        auth().protect();
      }
    })(req);
  }

  // Otherwise skip authentication
  return NextResponse.next();
}
