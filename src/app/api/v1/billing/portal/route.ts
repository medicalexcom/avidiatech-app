import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
  }

  try {
    const ctx = await resolveTenantContext();
    const supabase = getServiceSupabase();
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Failed to create portal session', err);
    return NextResponse.json({ error: err.message || 'Unable to open billing portal' }, { status: 500 });
  }
}
