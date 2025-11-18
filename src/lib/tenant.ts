import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  role: string;
}

export async function ensureTenantForUser(userId: string): Promise<TenantContext> {
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

  if (existing.data) {
    return {
      tenantId: existing.data.tenant_id,
      tenantName: Array.isArray(existing.data.tenants)
        ? existing.data.tenants[0]?.name ?? 'Workspace'
        : (existing.data as any).tenants?.name ?? 'Workspace',
      role: existing.data.role,
    };
  }

  const user = await clerkClient.users.getUser(userId);
  const tenantName = user.fullName || user.primaryEmailAddress?.emailAddress || 'Workspace';

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
    .insert({ tenant_id: createdTenant.data.id, user_id: userId, role: 'owner', is_active: true })
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

export async function resolveTenantContext(): Promise<TenantContext> {
  const { userId } = auth();
  if (!userId) {
    throw new NextResponse('Unauthorized', { status: 401 }) as unknown as Error;
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role, tenants(name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to load tenant membership', error);
    throw new NextResponse('Failed to resolve tenant', { status: 500 }) as unknown as Error;
  }
  if (!data) {
    return ensureTenantForUser(userId);
  }

  return {
    tenantId: data.tenant_id,
    tenantName: Array.isArray(data.tenants)
      ? data.tenants[0]?.name ?? 'Workspace'
      : (data as any).tenants?.name ?? 'Workspace',
    role: data.role,
  };
}
