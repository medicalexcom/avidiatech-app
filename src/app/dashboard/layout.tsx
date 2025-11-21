export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import TopNavClient from '@/components/TopNavClient';
import Sidebar from '@/components/Sidebar';
import { getTenantContextForUser } from '@/lib/billing';
import { HttpError } from '@/lib/errors';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId, sessionClaims, has } = await auth();
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

  if (!userId) {
    redirect(`${signInUrl}?redirect_url=/dashboard`);
  }

  let showSubscriptionBanner = false;
  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await getTenantContextForUser({ userId, userEmail });
    if (context.role !== 'owner' && !context.subscription.isActive) {
      redirect('/subscribe');
    }
    showSubscriptionBanner = context.role !== 'owner' && !context.subscription.isActive;
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      redirect(`${signInUrl}?redirect_url=/dashboard`);
    }
    throw error;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavClient />
      {showSubscriptionBanner && (
        <div className="bg-amber-100 text-amber-900 px-6 py-3 text-sm border-b border-amber-200">
          Your subscription is inactive. Please update billing to restore full access.
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
