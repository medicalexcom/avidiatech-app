import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { getOwnerEmails, normalizeEmail } from '@/lib/owners';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/v1/(.*)']);
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

export default clerkMiddleware((auth, req) => {
  const authResult = auth();
  const { userId, sessionClaims } = authResult;

  // Protect dashboard and API routes; redirect to sign-in if unauthenticated
  if (isProtectedRoute(req)) {
    const maybeResponse = authResult.protect({ unauthenticatedUrl: signInUrl });
    if (maybeResponse instanceof Response) {
      return maybeResponse;
    }
  }

  // Require tenant context for API calls
  if (req.nextUrl.pathname.startsWith('/api/v1')) {
    const tenantId =
      req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant context. Provide x-tenant-id or tenant_id.' },
        { status: 400 }
      );
    }
  }

  // Owner header injection
  const normalizedEmail = normalizeEmail(extractEmailFromSessionClaims(sessionClaims));
  const ownerEmails = getOwnerEmails();
  let response = NextResponse.next();

  if (userId && normalizedEmail && ownerEmails.includes(normalizedEmail)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-avidia-owner', 'true');
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  return response;
});

// Exclude static assets from middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { getOwnerEmails, normalizeEmail } from '@/lib/owners';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/v1/(.*)']);
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

export default clerkMiddleware((auth, req) => {
  const authResult = auth();
  const { userId, sessionClaims } = authResult;

  // Protect dashboard and API routes; redirect to sign-in if unauthenticated
  if (isProtectedRoute(req)) {
    const maybeResponse = authResult.protect({ unauthenticatedUrl: signInUrl });
    if (maybeResponse instanceof Response) {
      return maybeResponse;
    }
  }

  // Require tenant context for API calls
  if (req.nextUrl.pathname.startsWith('/api/v1')) {
    const tenantId =
      req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant context. Provide x-tenant-id or tenant_id.' },
        { status: 400 }
      );
    }
  }

  // Owner header injection
  const normalizedEmail = normalizeEmail(extractEmailFromSessionClaims(sessionClaims));
  const ownerEmails = getOwnerEmails();
  let response = NextResponse.next();

  if (userId && normalizedEmail && ownerEmails.includes(normalizedEmail)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-avidia-owner', 'true');
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  return response;
});

// Exclude static assets from middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};};