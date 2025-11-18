import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  role: string;
}

interface MembershipRow {
  tenant_id: string;
  role: string;
  tenants?: { name?: string }[];
}

function tenantNameFromRow(row: MembershipRow): string {
  return Array.isArray(row.tenants)
    ? row.tenants[0]?.name ?? 'Workspace'
    : (row as any).tenants?.name ?? 'Workspace';
}

async function getActiveMembership(userId: string): Promise<TenantContext | null> {
  const supabase = getServiceSupabase();
  const existing = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role, tenants(name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.error('Failed to look up tenant membership', existing.error);
    throw new NextResponse('Failed to resolve tenant', { status: 500 }) as unknown as Error;
  }

  if (!existing.data) return null;

  return {
    tenantId: existing.data.tenant_id,
    tenantName: tenantNameFromRow(existing.data as MembershipRow),
    role: existing.data.role,
  };
}

async function createTenantAndMembership(
  userId: string,
  tenantName: string,
  role: string,
): Promise<TenantContext> {
  const supabase = getServiceSupabase();
  const createdTenant = await supabase
    .from('tenants')
    .insert({ name: tenantName })
    .select('id, name')
    .single();

  if (createdTenant.error || !createdTenant.data) {
    console.error('Failed to create tenant for user', createdTenant.error);
    throw new NextResponse('Failed to create tenant', { status: 500 }) as unknown as Error;
  }

  const membership = await supabase
    .from('tenant_memberships')
    .insert({ tenant_id: createdTenant.data.id, user_id: userId, role, is_active: true })
    .select('tenant_id, role')
    .single();

  if (membership.error || !membership.data) {
    console.error('Failed to create tenant membership for user', membership.error);
    throw new NextResponse('Failed to create tenant membership', { status: 500 }) as unknown as Error;
  }

  return {
    tenantId: membership.data.tenant_id,
    tenantName: createdTenant.data.name,
    role: membership.data.role,
  };
}

export async function ensureTenantForUser(userId: string): Promise<TenantContext> {
  const existing = await getActiveMembership(userId);
  if (existing) return existing;

  const user = await clerkClient.users.getUser(userId);
  const tenantName = user.fullName || user.primaryEmailAddress?.emailAddress || 'Workspace';

  return createTenantAndMembership(userId, tenantName, 'owner');
}

export async function ensureTenantFromProfile(params: {
  userId: string;
  fullName?: string | null;
  email?: string | null;
  role?: string;
  active?: boolean;
}): Promise<TenantContext> {
  const { userId, fullName, email, role = 'owner', active = true } = params;
  const existing = await getActiveMembership(userId);

  if (active === false) {
    if (existing) {
      const supabase = getServiceSupabase();
      await supabase.from('tenant_memberships').update({ is_active: false }).eq('user_id', userId);
    }
    return existing ?? { tenantId: '', tenantName: '', role };
  }

  if (existing) return existing;

  const tenantName = fullName?.trim() || email || 'Workspace';
  return createTenantAndMembership(userId, tenantName, role);
}

export async function resolveTenantContext(): Promise<TenantContext> {
  const { userId } = auth();
  if (!userId) {
    throw new NextResponse('Unauthorized', { status: 401 }) as unknown as Error;
  }

  const existing = await getActiveMembership(userId);
  if (!existing) {
    return ensureTenantForUser(userId);
  }

  return existing;
}
