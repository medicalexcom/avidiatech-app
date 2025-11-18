import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { tenantId } = await resolveTenantContext();
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('product_history')
      .select('id, product_id, version, summary, changed_by, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
