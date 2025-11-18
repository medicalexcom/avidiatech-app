'use client';

import {
  ClerkLoaded,
  ClerkLoading,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function LoginGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg space-y-4 rounded-lg border border-yellow-200 bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-gray-900">Clerk is not configured</h1>
          <p className="text-sm text-gray-700">
            Add <code className="rounded bg-gray-100 px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and
            <code className="ml-1 rounded bg-gray-100 px-1 py-0.5">CLERK_SECRET_KEY</code> to enable authentication.
          </p>
          <p className="text-sm text-gray-600">Dashboard routes are protected when Clerk is enabled.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClerkLoading>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-700">
          Checking your session...
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>{children}</SignedIn>
        <SignedOut>
          <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
            <div className="max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
              <h1 className="text-xl font-semibold text-gray-900">Sign in required</h1>
              <p className="text-sm text-gray-700">
                Your session has expired or you are not signed in. Continue to sign in to access the dashboard.
              </p>
              <RedirectToSignIn redirectUrl={pathname || '/dashboard'} />
            </div>
          </div>
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}
