import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/v1/(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect({ unauthenticatedUrl: '/sign-in' });
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
