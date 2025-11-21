import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Apply this middleware to all routes except Next.js static files and API routes
export const config = {
  matcher: ['/((?!\\..*|_next).*)', '/api/(.*)'],
};

// Dynamic middleware that activates Clerk only when the necessary environment variables are set
export default async function middleware(req: NextRequest) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  // If Clerk keys are available, use Clerk middleware to protect non-public routes
  if (publishableKey && secretKey) {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

    return clerkMiddleware((auth) => {
      if (!isPublicRoute(req)) {
        auth().protect();
      }
    })(req);
  }

  // If Clerk keys are missing, skip authentication and continue to next middleware/handler
  return NextResponse.next();
}
