import { NextResponse } from 'next/server';
import { BillingError, checkUsageAllowance, recordUsage } from '@/lib/usage';
import { resolveTenantContext } from '@/lib/tenant';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * Proxy endpoint for product ingestion with subscription enforcement and
 * usage tracking. Resolves the caller's tenant via Clerk, ensures an active
 * subscription, increments usage, and forwards the request to the ingestion
 * engine configured in the environment.
 */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const { tenantId } = await resolveTenantContext();
    const allowance = await checkUsageAllowance(tenantId, 'ingestion');

    const engineUrl =
      process.env.RENDER_ENGINE_URL || process.env.NEXT_PUBLIC_INGEST_API_URL;
    if (!engineUrl) {
      return NextResponse.json(
        { error: 'RENDER_ENGINE_URL or NEXT_PUBLIC_INGEST_API_URL not configured' },
        { status: 500 },
      );
    }

    const authToken = process.env.RENDER_ENGINE_AUTH_TOKEN;
    const target = `${engineUrl.replace(/\/$/, '')}/ingest?url=${encodeURIComponent(url)}&tenant_id=${tenantId}`;
    const res = await fetch(target, {
      method: 'get',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
    const data = await res.json();

    if (res.ok) {
      await recordUsage(allowance);
      try {
        const supabase = getServiceSupabase();
        await supabase.from('product_history').insert({
          tenant_id: tenantId,
          product_id: data.product_id || crypto.randomUUID(),
          version: 1,
          summary: data.summary || `Ingested ${url}`,
          changed_by: 'ingest-endpoint',
        });
      } catch (err) {
        console.warn('Unable to persist product history', err);
      }
    }

    return NextResponse.json({ tenant_id: tenantId, ...data }, { status: res.status });
  } catch (err: any) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof Response) return err;
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to connect to ingestion engine' },
      { status: 500 },
    );
  }
}
