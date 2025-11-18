import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const ctx = await resolveTenantContext();
    const supabase = getServiceSupabase();

    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    const { data: usage } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: members } = await supabase
      .from('tenant_memberships')
      .select('id, user_id, role, created_at, is_active')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ tenant: ctx, subscription, usage, members });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Failed to resolve tenant', err);
    return NextResponse.json({ error: 'Failed to resolve tenant context' }, { status: 500 });
  }
}
