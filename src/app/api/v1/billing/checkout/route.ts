import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { PLAN_CONFIG, type PlanSlug, normalizePlanSlug } from '@/config/plans';

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
  }
  try {
    const ctx = await resolveTenantContext();
    const body = await req.json().catch(() => ({}));
    const planSlug = normalizePlanSlug((body as { plan?: PlanSlug }).plan);
    const plan = PLAN_CONFIG[planSlug];
    const configuredPrice = plan.priceEnv ? process.env[plan.priceEnv] : undefined;
    const priceId = configuredPrice || process.env.STRIPE_DEFAULT_PRICE_ID || '';

    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription?canceled=1`,
      customer: undefined,
      client_reference_id: ctx.tenantId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Stripe checkout creation failed', err);
    return NextResponse.json({ error: err.message || 'Unable to start checkout' }, { status: 500 });
  }
}
