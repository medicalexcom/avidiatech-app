'use client';

import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function AccountPage() {
  if (!clerkEnabled) {
    return (
      <div className="space-y-4 rounded-lg border border-yellow-200 bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-gray-700">
          Clerk is not configured. Add <code className="rounded bg-gray-100 px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to
          enable the hosted user profile and management experience.
        </p>
        <Link href="/" className="text-blue-600 underline">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-gray-700">Manage your user profile, connected accounts, and security settings.</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <UserProfile routing="path" path="/dashboard/account" />
      </div>
    </div>
  );
}
