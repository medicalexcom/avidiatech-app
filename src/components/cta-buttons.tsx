'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

export function CTAButtons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SignedOut>
        <SignUpButton mode="modal" forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard">
          <button className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400">
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
          <button className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/5">
            Open Dashboard
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
        >
          Get Started
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
        >
          Open Dashboard
        </Link>
      </SignedIn>
    </div>
  );
}
