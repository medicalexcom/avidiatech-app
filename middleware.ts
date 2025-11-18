import { authMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secret = process.env.CLERK_SECRET_KEY;
const isClerkConfigured = Boolean(publishable && secret);

export default function middleware(req: NextRequest) {
  if (!isClerkConfigured) {
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.json(
        { error: 'Clerk is not configured. Add Clerk keys to protect dashboard routes.' },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  return authMiddleware({
    publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
    afterAuth(auth, request) {
      if (!auth.userId && request.nextUrl.pathname.startsWith('/dashboard')) {
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('redirect_url', request.url);
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.next();
    },
  })(req);
}

export const runtime = 'nodejs';

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/'],
};
