import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { enforceSubscriptionAndTrack, BillingError } from '@/lib/usage';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * Generate a description by forwarding to the describe engine. Requires
 * authentication via Clerk and enforces subscription limits before
 * proxying the request.
 */
export async function POST(req: Request) {
  try {
    const { prompt, productId, language, tone } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const { tenantId } = await resolveTenantContext();
    await enforceSubscriptionAndTrack(tenantId, 'description');

    const supabase = getServiceSupabase();
    await supabase.from('description_requests').insert({
      tenant_id: tenantId,
      prompt,
      tone,
      language,
    });

    const engineUrl = process.env.RENDER_ENGINE_URL || process.env.NEXT_PUBLIC_INGEST_API_URL;
    if (!engineUrl) {
      return NextResponse.json(
        { error: 'RENDER_ENGINE_URL or NEXT_PUBLIC_INGEST_API_URL not configured' },
        { status: 500 },
      );
    }
    const target = `${engineUrl.replace(/\/$/, '')}/describe`;
    const authToken = process.env.RENDER_ENGINE_AUTH_TOKEN;
    const res = await fetch(target, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ prompt, productId, language, tone, tenant_id: tenantId }),
    });

    const data = await res.json();

    if (res.ok && data?.description) {
      await supabase.from('product_history').insert({
        tenant_id: tenantId,
        product_id: data.product_id || crypto.randomUUID(),
        version: 1,
        summary: data.description.slice(0, 240),
        changed_by: 'describe-endpoint',
      });
    }

    return NextResponse.json({ tenant_id: tenantId, ...data }, { status: res.status });
  } catch (err: any) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof Response) return err;
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
