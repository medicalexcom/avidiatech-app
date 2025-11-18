import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard', '/dashboard/(.*)', '/api/v1/(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = auth();

    if (!userId) {
      try {
        return redirectToSignIn({ returnBackUrl: req.url });
      } catch (error) {
        // Fallback redirect for environments where Clerk helper fails (prevents middleware 500s)
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  if (req.nextUrl.pathname.startsWith('/api/v1')) {
    const tenantId = req.headers.get('x-tenant-id') || req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant context. Provide x-tenant-id or tenant_id.' }, { status: 400 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
