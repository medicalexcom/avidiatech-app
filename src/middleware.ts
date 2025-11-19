import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { getOwnerEmails, normalizeEmail } from '@/lib/owners';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/v1/(.*)']);
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

export default clerkMiddleware((auth, req) => {
  // Call auth() only once to obtain user and session claims
  const authResult = auth();
  const { userId, sessionClaims } = authResult;

  // Protected routes: require authentication
  if (isProtectedRoute(req)) {
    const maybeResponse = authResult.protect({ unauthenticatedUrl: signInUrl });
  // Call auth() only once
  const authResult = auth();
  const { userId, sessionClaims } = authResult;

  // ---- Protected routes ----
  if (isProtectedRoute(req)) {
    const maybeResponse = authResult.protect({ unauthenticatedUrl: signInUrl });
    // If protect() returns a Response, immediately return it
    if (maybeResponse instanceof Response) {
      return maybeResponse;
    }
  }

  // ---- Require tenant context for API calls ----
  if (req.nextUrl.pathname.startsWith('/api/v1')) {
    const tenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant context. Provide x-tenant-id or tenant_id.' },
        { status: 400 }
      );
    }
  }

  // ---- Owner header injection ----
  const normalizedEmail = normalizeEmail(extractEmailFromSessionClaims(sessionClaims));
  const ownerEmails = getOwnerEmails();

  // Default response
  let response = NextResponse.next();

  // If current user is in the list of owner emails, mark them as owner
  if (userId && normalizedEmail && ownerEmails.includes(normalizedEmail)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-avidia-owner', 'true');
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  return response;
});

// Exclude static assets from the middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
