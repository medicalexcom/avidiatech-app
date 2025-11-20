import { NextResponse } from 'next/server';
import { clerkClient } from '@/lib/clerk-server';
import { HttpError } from './errors';
import { getServiceSupabaseClient } from './supabase';
import { getOwnerEmails, normalizeEmail } from './owners';

export type TenantRole = 'owner' | 'admin' | 'member';
export type UsageFeature = 'ingestion' | 'seo' | 'variants' | 'match';

const FEATURE_COLUMNS: Record<UsageFeature, { column: string; quotaKey: keyof SubscriptionStatus['quotas'] }> = {
  ingestion: { column: 'ingestion_count', quotaKey: 'ingestion' },
  seo: { column: 'seo_count', quotaKey: 'seo' },
  variants: { column: 'variants_count', quotaKey: 'variants' },
  match: { column: 'match_count', quotaKey: 'match' },
};

export interface SubscriptionStatus {
  planName: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  quotas: {
    ingestion: number | null;
    seo: number | null;
    variants: number | null;
    match: number | null;
  };
  isActive: boolean;
}

export interface UsageSnapshot {
  id: string;
  tenant_id: string;
  period_start: string;
  ingestion_count: number;
  seo_count: number;
  variants_count: number;
  match_count: number;
  updated_at?: string;
}

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
  subscription: SubscriptionStatus;
  usage: UsageSnapshot;
}

async function resolveOwnerOverride(userId: string, userEmail?: string): Promise<boolean> {
  const ownerEmails = getOwnerEmails();
  if (ownerEmails.length === 0) {
    return false;
  }

  const normalizedEmail = normalizeEmail(userEmail);
  if (normalizedEmail) {
    return ownerEmails.includes(normalizedEmail);
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primary =
      normalizeEmail(user.primaryEmailAddress?.emailAddress) ||
      normalizeEmail(user.emailAddresses?.[0]?.emailAddress);
    if (!primary) {
      return false;
    }
    return ownerEmails.includes(primary);
  } catch (error) {
    console.error('Failed to resolve owner override', error);
    return false;
  }
}

function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return ['active', 'trialing', 'paid'].includes(status);
}

export function tenantFromRequest(req: Request): string | undefined {
  const headerTenant = req.headers.get('x-tenant-id');
  if (headerTenant) return headerTenant;
  const url = new URL(req.url);
  return url.searchParams.get('tenant_id') ?? undefined;
}

async function resolveTenantMembership(userId: string, requestedTenantId?: string): Promise<{ tenantId: string; role: TenantRole }> {
  const supabase = getServiceSupabaseClient();
  let query = supabase
    .from('team_members')
    .select('tenant_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (requestedTenantId) {
    query = query.eq('tenant_id', requestedTenantId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  const membership = data?.[0];
  if (!membership) {
    throw new HttpError(403, 'No tenant membership found for user.');
  }
  return { tenantId: membership.tenant_id, role: membership.role as TenantRole };
}

async function fetchSubscription(tenantId: string): Promise<SubscriptionStatus> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(
      'plan_name, status, current_period_end, ingestion_quota, seo_quota, variant_quota, match_quota',
    )
    .eq('tenant_id', tenantId)
    .order('current_period_end', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0];
  return {
    planName: row?.plan_name ?? null,
    status: row?.status ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    quotas: {
      ingestion: row?.ingestion_quota ?? null,
      seo: row?.seo_quota ?? null,
      variants: row?.variant_quota ?? null,
      match: row?.match_quota ?? null,
    },
    isActive: isSubscriptionActive(row?.status ?? null),
  };
}

async function getOrCreateUsageRow(tenantId: string): Promise<UsageSnapshot> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('usage_counters')
    .select('id, tenant_id, period_start, ingestion_count, seo_count, variants_count, match_count, updated_at')
    .eq('tenant_id', tenantId)
    .order('period_start', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    const row = data[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      period_start: row.period_start,
      ingestion_count: row.ingestion_count ?? 0,
      seo_count: row.seo_count ?? 0,
      variants_count: row.variants_count ?? 0,
      match_count: row.match_count ?? 0,
      updated_at: row.updated_at ?? undefined,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: inserted, error: insertError } = await supabase
    .from('usage_counters')
    .insert({ tenant_id: tenantId, period_start: today })
    .select('id, tenant_id, period_start, ingestion_count, seo_count, variants_count, match_count, updated_at')
    .limit(1);

  if (insertError) {
    throw new Error(insertError.message);
  }

  const insertedRow = inserted?.[0];
  return {
    id: insertedRow.id,
    tenant_id: insertedRow.tenant_id,
    period_start: insertedRow.period_start,
    ingestion_count: insertedRow.ingestion_count ?? 0,
    seo_count: insertedRow.seo_count ?? 0,
    variants_count: insertedRow.variants_count ?? 0,
    match_count: insertedRow.match_count ?? 0,
    updated_at: insertedRow.updated_at ?? undefined,
  };
}

async function incrementUsage(usage: UsageSnapshot, feature: UsageFeature, amount: number): Promise<UsageSnapshot> {
  const supabase = getServiceSupabaseClient();
  const { column } = FEATURE_COLUMNS[feature];
  const newValue = (usage[column as keyof UsageSnapshot] as number) + amount;

  const { error } = await supabase
    .from('usage_counters')
    .update({ [column]: newValue, updated_at: new Date().toISOString() })
    .eq('id', usage.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...usage,
    [column]: newValue,
  } as UsageSnapshot;
}

export async function getTenantContextForUser({
  userId,
  requestedTenantId,
  userEmail,
}: {
  userId: string;
  requestedTenantId?: string;
  userEmail?: string;
}): Promise<TenantContext> {
  const membership = await resolveTenantMembership(userId, requestedTenantId);
  const subscription = await fetchSubscription(membership.tenantId);
  const usage = await getOrCreateUsageRow(membership.tenantId);
  const hasOwnerOverride =
    membership.role === 'owner' ? true : await resolveOwnerOverride(userId, userEmail);
  const role: TenantRole = hasOwnerOverride ? 'owner' : membership.role;

  return {
    tenantId: membership.tenantId,
    role,
    subscription,
    usage,
  };
}

export async function requireSubscriptionAndUsage({
  userId,
  requestedTenantId,
  feature,
  increment = 1,
  userEmail,
}: {
  userId: string;
  requestedTenantId?: string;
  feature?: UsageFeature;
  increment?: number;
  userEmail?: string;
}): Promise<TenantContext> {
  const context = await getTenantContextForUser({ userId, requestedTenantId, userEmail });
  const isOwner = context.role === 'owner';

  if (!isOwner && !context.subscription.isActive) {
    throw new HttpError(402, 'An active subscription is required for this action.');
  }

  if (feature) {
    const { quotaKey } = FEATURE_COLUMNS[feature];
    const quota = context.subscription.quotas[quotaKey];
    const currentUsage = context.usage[FEATURE_COLUMNS[feature].column as keyof UsageSnapshot] as number;
    const projected = currentUsage + increment;

    if (!isOwner && quota !== null && projected > quota) {
      throw new HttpError(402, 'Quota exceeded for this plan. Please upgrade to continue.');
    }

    const updatedUsage = await incrementUsage(context.usage, feature, increment);
    return {
      ...context,
      usage: updatedUsage,
    };
  }

  return context;
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
