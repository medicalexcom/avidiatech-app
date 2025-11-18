import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  role: string;
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
    throw new NextResponse('No tenant membership found', { status: 404 }) as unknown as Error;
  }

  return {
    tenantId: data.tenant_id,
    tenantName: Array.isArray(data.tenants)
      ? data.tenants[0]?.name ?? 'Workspace'
      : (data as any).tenants?.name ?? 'Workspace',
    role: data.role,
  };
}
