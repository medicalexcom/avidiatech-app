import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { resolveTenantContext } from '@/lib/tenant';
import { getServiceSupabase } from '@/lib/supabase';
import { PLAN_CONFIG, normalizePlanSlug } from '@/config/plans';
import { getCurrentPeriodStart } from '@/lib/usage';

export async function GET() {
  try {
    const ctx = await resolveTenantContext();
    const supabase = getServiceSupabase();

    const { data: subscriptionRow } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    const { data: usage } = await supabase
      .from('usage_counters')
      .select('ingestion_count, description_count, period_start')
      .eq('tenant_id', ctx.tenantId)
      .eq('period_start', getCurrentPeriodStart())
      .maybeSingle();

    let subscription = subscriptionRow;
    const plan = PLAN_CONFIG[normalizePlanSlug(subscriptionRow?.plan_name)];

    if (process.env.STRIPE_SECRET_KEY && subscriptionRow?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionRow.stripe_subscription_id, {
          expand: ['items.data.price.product'],
        });

        const primaryPrice = stripeSub.items.data[0]?.price;
        const nickname = primaryPrice?.nickname || (primaryPrice?.product as any)?.name;

        subscription = {
          ...subscriptionRow,
          status: stripeSub.status,
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          plan_name: nickname || subscriptionRow.plan_name,
          ingestion_quota: subscriptionRow.ingestion_quota ?? plan.ingestionQuota,
          description_quota: subscriptionRow.description_quota ?? plan.descriptionQuota,
        } as typeof subscriptionRow;
      } catch (stripeError) {
        console.error('Stripe subscription lookup failed', stripeError);
      }
    }

    if (subscription) {
      subscription = {
        ...subscription,
        ingestion_quota: subscription.ingestion_quota ?? plan.ingestionQuota,
        description_quota: subscription.description_quota ?? plan.descriptionQuota,
      } as typeof subscription;
    }

    const { data: members } = await supabase
      .from('tenant_memberships')
      .select('id, user_id, role, created_at, is_active')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ tenant: ctx, subscription, usage, members, plan });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Failed to resolve tenant', err);
    return NextResponse.json({ error: 'Failed to resolve tenant context' }, { status: 500 });
  }
}
