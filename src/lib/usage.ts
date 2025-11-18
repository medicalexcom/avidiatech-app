import { PLAN_CONFIG, normalizePlanSlug } from '@/config/plans';
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

export interface UsageAllowance {
  tenantId: string;
  metric: UsageMetric;
  nextUsage: number;
  quota: number | null;
  plan: string;
  status: string;
  periodStart: string;
  usageColumn: string;
  usageRowId?: string;
}

export function getCurrentPeriodStart(): string {
  const now = new Date();
  const key = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  return key;
}

function resolveQuotaForMetric(planName: string | undefined, metric: UsageMetric): number | null {
  const plan = PLAN_CONFIG[normalizePlanSlug(planName)];
  return metric === 'ingestion' ? plan.ingestionQuota : plan.descriptionQuota;
}

/**
 * Preflight subscription check that validates the tenant's plan and determines whether the next
 * call is allowed. Throws a BillingError when the quota would be exceeded.
 */
export async function checkUsageAllowance(
  tenantId: string,
  metric: UsageMetric,
): Promise<UsageAllowance> {
  const supabase = getServiceSupabase();
  const { data: subscription, error: subscriptionError } = await supabase
    .from('tenant_subscriptions')
    .select('plan_name, status, ingestion_quota, description_quota')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (subscriptionError) {
    console.error('Failed to load subscription', subscriptionError);
    throw new Error('Subscription lookup failed');
  }

  if (!subscription || subscription.status !== 'active') {
    throw new BillingError('Subscription inactive. Update billing to continue.');
  }

  const periodStart = getCurrentPeriodStart();
  const usageColumn = columnMap[metric];
  const quotaColumn = quotaMap[metric];

  const { data: existingUsage, error: usageError } = await supabase
    .from('usage_counters')
    .select(`id, ${usageColumn}`)
    .eq('tenant_id', tenantId)
    .eq('period_start', periodStart)
    .maybeSingle();

  if (usageError) {
    console.error('Usage lookup failed', usageError);
    throw new Error('Usage lookup failed');
  }

  const usageRow = existingUsage as any;
  const currentUsage = usageRow?.[usageColumn] ?? 0;
  const quota = subscription[quotaColumn] ?? resolveQuotaForMetric(subscription.plan_name, metric);
  const nextUsage = currentUsage + 1;

  if (quota && nextUsage > quota) {
    throw new BillingError(`Quota exceeded for ${metric}.`, 402, 'quota_exceeded');
  }

  return {
    tenantId,
    metric,
    nextUsage,
    quota: quota ?? null,
    plan: subscription.plan_name,
    status: subscription.status,
    periodStart,
    usageColumn,
    usageRowId: usageRow?.id,
  };
}

/**
 * Persist the usage increment after a successful downstream API call.
 */
export async function recordUsage(allowance: UsageAllowance): Promise<void> {
  const supabase = getServiceSupabase();
  const { error: upsertError } = await supabase.from('usage_counters').upsert({
    id: allowance.usageRowId,
    tenant_id: allowance.tenantId,
    period_start: allowance.periodStart,
    [allowance.usageColumn]: allowance.nextUsage,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.error('Failed to update usage', upsertError);
    throw new Error('Unable to update usage counters');
  }
}
