'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function TopNav() {
  return (
    <header className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
      <div className="text-xl font-bold">AvidiaTech Dashboard</div>
      <nav className="flex space-x-6 items-center">
        <div className="flex space-x-4">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/analytics">Analytics</Link>
          <Link href="/dashboard/visualize">Visualize</Link>
          <Link href="/dashboard/extract">Extract</Link>
          <Link href="/dashboard/describe">Describe</Link>
        </div>
        <div className="flex space-x-4 border-l border-gray-600 pl-4">
          <Link href="/dashboard/organization">Organization</Link>
          <Link href="/dashboard/roles">Roles</Link>
          <Link href="/dashboard/subscription">Subscription</Link>
          <Link href="/dashboard/api-keys">API Keys</Link>
          <Link href="/dashboard/versioning">History</Link>
        </div>
        <div className="flex space-x-2 border-l border-gray-600 pl-4 items-center">
          {clerkEnabled ? (
            <>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Sign in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded bg-blue-500 px-3 py-1 text-sm">Sign up</button>
                </SignUpButton>
              </SignedOut>
            </>
          ) : (
            <span className="rounded bg-yellow-500/20 px-3 py-1 text-xs text-yellow-100">
              Clerk disabled
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
