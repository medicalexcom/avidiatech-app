import { NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase';

export type UsageMetric = 'ingestion' | 'description';

const columnMap: Record<UsageMetric, string> = {
  ingestion: 'ingestion_count',
  description: 'description_count',
};

const quotaMap: Record<UsageMetric, string> = {
  ingestion: 'ingestion_quota',
  description: 'description_quota',
};

export class BillingError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 402, code = 'billing_required') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function enforceSubscriptionAndTrack(
  tenantId: string,
  metric: UsageMetric,
): Promise<{ usage: number; quota: number | null; status: string; plan: string } | null> {
  const supabase = getServiceSupabase();
  const { data: subscription, error: subscriptionError } = await supabase
    .from('tenant_subscriptions')
    .select(
      'plan_name, status, current_period_end, ingestion_quota, description_quota'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (subscriptionError) {
    console.error('Failed to load subscription', subscriptionError);
    throw new NextResponse('Subscription lookup failed', { status: 500 }) as unknown as Error;
  }

  if (!subscription || subscription.status !== 'active') {
    throw new BillingError('Subscription inactive. Update billing to continue.');
  }

  const periodStart = new Date();
  const periodKey = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const usageColumn = columnMap[metric];
  const quotaColumn = quotaMap[metric];

  const { data: existingUsage, error: usageError } = await supabase
    .from('usage_counters')
    .select(`id, ${usageColumn}`)
    .eq('tenant_id', tenantId)
    .eq('period_start', periodKey)
    .maybeSingle();

  if (usageError) {
    console.error('Usage lookup failed', usageError);
    throw new NextResponse('Usage lookup failed', { status: 500 }) as unknown as Error;
  }

  const usageRow = existingUsage as any;
  const currentUsage = usageRow?.[usageColumn] ?? 0;
  const quota = subscription[quotaColumn] ?? null;
  const newUsage = currentUsage + 1;

  if (quota && newUsage > quota) {
    throw new BillingError(`Quota exceeded for ${metric}.`, 402, 'quota_exceeded');
  }

  const payload = {
    id: usageRow?.id,
    tenant_id: tenantId,
    period_start: periodKey,
    [usageColumn]: newUsage,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase.from('usage_counters').upsert(payload);
  if (upsertError) {
    console.error('Failed to update usage', upsertError);
  }

  return { usage: newUsage, quota, status: subscription.status, plan: subscription.plan_name };
}
