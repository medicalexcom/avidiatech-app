import { authMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secret = process.env.CLERK_SECRET_KEY;
const isClerkConfigured = Boolean(publishable && secret);

export default function middleware(req: NextRequest) {
  if (!isClerkConfigured) {
    return NextResponse.next();
  }

  return authMiddleware({
    publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
  })(req);
}

export const runtime = 'nodejs';

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/'],
};
