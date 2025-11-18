import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secret = process.env.CLERK_SECRET_KEY;

export default publishable && secret
  ? authMiddleware({
      publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
    })
  : (() => NextResponse.next());

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/'],
};
