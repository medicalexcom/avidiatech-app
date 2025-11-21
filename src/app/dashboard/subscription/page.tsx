import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getTenantContextForUser } from '@/lib/billing';
import { HttpError } from '@/lib/errors';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const { userId, sessionClaims } = await auth();  // ✅ Added await

  if (!userId) {
    redirect('/sign-in?redirect_url=/dashboard/subscription');
  }

  let context;
  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    context = await getTenantContextForUser({ userId, userEmail });
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      redirect('/sign-in?redirect_url=/dashboard/subscription');
    }
    throw error;
  }

  const { tenantId, role, subscription, usage } = context;
  const isOwner = role === 'owner';

  const planLabel = isOwner ? 'Owner Unlimited' : subscription.planName ?? 'No active plan';
  const statusLabel = isOwner ? 'active (owner bypass)' : subscription.status ?? 'inactive';
  const activeState = isOwner || subscription.isActive ? 'Active' : 'Inactive';

  const quotaDisplay = [
    { key: 'ingestion', label: 'Ingestion jobs', used: usage.ingestion_count, quota: subscription.quotas.ingestion },
    { key: 'seo', label: 'SEO runs', used: usage.seo_count, quota: subscription.quotas.seo },
    { key: 'variants', label: 'Variants generated', used: usage.variants_count, quota: subscription.quotas.variants },
    { key: 'match', label: 'Matching jobs', used: usage.match_count, quota: subscription.quotas.match },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">Tenant</p>
          <p className="font-mono text-gray-900">{tenantId}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Role</p>
          <p className="font-semibold text-gray-900 capitalize">{role}</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-gray-700">Plan: {planLabel}</p>
        <p className="text-gray-700">Status: {statusLabel}</p>
        <p className="text-gray-700">Overall state: {activeState}</p>
        {subscription.currentPeriodEnd && !isOwner && (
          <p className="text-gray-500 text-sm">
            Current period ends on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        {isOwner && (
          <p className="text-green-700 text-sm">Owners bypass subscription checks but still log usage.</p>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-3">Usage this period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quotaDisplay.map((item) => (
            <div key={item.key} className="border rounded p-3">
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-gray-700">
                {item.used} / {item.quota !== null ? item.quota : '∞'}
              </p>
              {!isOwner && item.quota !== null && item.used >= item.quota && (
                <p className="text-xs text-red-600">Quota exceeded</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!subscription.isActive && !isOwner && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Activate your plan</h3>
          <p className="text-sm">
            A paid Stripe subscription is required for full access. Please update billing to continue using the platform.
          </p>
        </div>
      )}
    </div>
  );
}
