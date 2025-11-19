// src/middleware.ts
import {
  clerkMiddleware,
  createRouteMatcher,
} from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes (adjust to match your app)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
]);

// API routes where you enforce tenant ID
const isTenantApiRoute = createRouteMatcher(['/api/v1(.*)']);

const OWNER_HEADER = 'x-avidia-owner';

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const signInUrl =
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

  // Call auth() exactly once
  const authResult = await auth();
  const { userId, sessionClaims } = authResult;

  // Start from NextResponse.next() so you can mutate it if needed
  let response = NextResponse.next();

  // ---------- AUTH PROTECTION ----------

  // If the route is not public, enforce authentication
  if (!isPublicRoute(req)) {
    // auth.protect() is the officially supported pattern in middleware :contentReference[oaicite:0]{index=0}
    await auth.protect({
      unauthenticatedUrl: signInUrl,
    });
    // If the user is unauthenticated, the call above will already
    // trigger the redirect/404 and short‑circuit the request.
  }

  // ---------- OWNER BYPASS & TENANT VALIDATION ----------

  // NOTE: this is where you should paste the existing logic from main,
  // adapted to use authResult / sessionClaims if needed.
  //
  // Example structure (replace with your existing implementation):

  const url = req.nextUrl;

  // Owner override header (keep your exact semantics here)
  const ownerHeader = req.headers.get(OWNER_HEADER) ?? undefined;
  const ownerEmailsEnv = process.env.OWNER_EMAILS ?? '';
  const ownerEmails = ownerEmailsEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const sessionEmail =
    // depends on how you configured your session token; adjust if needed :contentReference[oaicite:1]{index=1}
    (sessionClaims as any)?.email?.toLowerCase?.() ??
    (sessionClaims as any)?.primaryEmail?.toLowerCase?.();

  const isOwner =
    !!sessionEmail &&
    ownerEmails.includes(sessionEmail) &&
    ownerHeader === 'true'; // or whatever flag you used before

  // Enforce tenant ID only for /api/v1 routes, unless owner bypass applies
  if (isTenantApiRoute(req) && !isOwner) {
    // Replace the following with your exact tenant ID validation:
    //
    // e.g. maybe you read:
    //   - const tenantId = req.headers.get('x-tenant-id')
    //   - or url.searchParams.get('tenantId')
    //
    const tenantIdHeader = req.headers.get('x-tenant-id');
    const tenantId =
      tenantIdHeader || url.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant id' },
        { status: 400 },
      );
    }

    // If you encode tenant/org in sessionClaims metadata, compare here :contentReference[oaicite:2]{index=2}
    const claims = sessionClaims as any;
    const sessionTenantId =
      claims?.metadata?.tenantId ?? claims?.tenantId;

    if (sessionTenantId && sessionTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant id' },
        { status: 403 },
      );
    }
  }

  // If you mutate headers on the response (e.g. pass tenant info downstream),
  // do it here before returning.
  //
  //   response.headers.set('x-tenant-id', tenantId);

  // Always return the final response object
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and most static files, but run on everything else :contentReference[oaicite:3]{index=3}
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api)(.*)',
  ],
};
