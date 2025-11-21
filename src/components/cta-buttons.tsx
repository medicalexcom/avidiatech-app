'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

export function CTAButtons() {
  // Determine if Clerk is configured (if publishable key is defined)
  const clerkEnabled = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkEnabled) {
    // Fallback buttons when Clerk is not configured
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
        >
          Get Started
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-medium text-white hover:border-white/20 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
        >
          Open Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <SignedOut>
        <SignUpButton mode="modal" forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard">
          <button className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50">
            Get Started
          </button>
        </SignUpButton>
        <SignInButton
          mode="modal"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          <button className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-medium text-white hover:border-white/20 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50">
            Open Dashboard
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
        >
          Get Started
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-medium text-white hover:border-white/20 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-50"
        >
          Open Dashboard
        </Link>
      </SignedIn>
    </div>
  );
}
