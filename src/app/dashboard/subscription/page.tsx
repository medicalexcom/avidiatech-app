import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getTenantContextForUser } from '@/lib/billing';
import { HttpError } from '@/lib/errors';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import PageShell, { PageHeader } from '@/components/layout/PageShell';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const { userId, sessionClaims } = await auth();

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

  const planLabel = isOwner ? 'Owner Unlimited' : (subscription.planName ?? 'No active plan');
  const statusLabel = isOwner ? 'Active (owner bypass)' : (subscription.status ?? 'Inactive');
  const isActive = isOwner || subscription.isActive;

  const quotaDisplay = [
    { key: 'ingestion', label: 'Ingestion jobs', used: usage.ingestion_count, quota: subscription.quotas.ingestion },
    { key: 'seo', label: 'SEO runs', used: usage.seo_count, quota: subscription.quotas.seo },
    { key: 'variants', label: 'Variants generated', used: usage.variants_count, quota: subscription.quotas.variants },
    { key: 'match', label: 'Matching jobs', used: usage.match_count, quota: subscription.quotas.match },
  ];

  return (
    <PageShell glow="indigo">
      <PageHeader
        glow="indigo"
        kicker="Subscription"
        dot={isActive ? "bg-emerald-500" : "bg-amber-400"}
        title="Plan & Usage"
        description="View your current subscription plan, quota usage, and billing details for your AvidiaTech workspace."
        right={
          <Link
            href="/settings/billing"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Manage billing
          </Link>
        }
      />

      {/* Inactive plan alert */}
      {!isActive && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 dark:border-amber-500/25 dark:bg-amber-500/8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-amber-500 text-lg leading-none">⚠</span>
            <div>
              <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">No active subscription</p>
              <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-400">
                A paid Stripe subscription is required for full access.{" "}
                <Link href="/settings/billing" className="font-semibold underline underline-offset-2">Update billing</Link>
                {" "}to continue using the platform.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Plan</p>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50">{planLabel}</p>
          {isOwner && (
            <p className="mt-1 text-[12px] text-emerald-600 dark:text-emerald-400">Unlimited access</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50 capitalize">{statusLabel}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Role</p>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50 capitalize">{role}</p>
          {subscription.currentPeriodEnd && !isOwner && (
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Tenant ID */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Workspace ID</p>
          <code className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[12px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {tenantId}
          </code>
        </div>
      </div>

      {/* Usage this period */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Usage this period
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quotaDisplay.map((item) => {
            const pct = item.quota !== null ? Math.min((item.used / item.quota) * 100, 100) : 0;
            const exceeded = !isOwner && item.quota !== null && item.used >= item.quota;
            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                  <p className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                    <span className={`font-semibold ${exceeded ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'}`}>
                      {item.used}
                    </span>
                    {" / "}
                    {item.quota !== null ? item.quota : "∞"}
                  </p>
                </div>
                {item.quota !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${exceeded ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {exceeded && (
                  <p className="text-[12px] text-red-600 dark:text-red-400">Quota exceeded — upgrade to continue</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isOwner && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/8">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✦</span>
            <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">Owner access</p>
          </div>
          <p className="mt-1 text-[12px] text-emerald-700 dark:text-emerald-400">
            Owners bypass subscription checks but usage is still logged for analytics purposes.
          </p>
        </div>
      )}
    </PageShell>
  );
}
