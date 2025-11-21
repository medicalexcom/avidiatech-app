import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getServiceSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id');
  const userEmail = searchParams.get('user_email');

  if (!tenantId || !userEmail) {
    return NextResponse.json({ error: 'Missing tenant_id or user_email' }, { status: 400 });
  }

  // Initialize Stripe
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  try {
    // Create or retrieve Stripe customer
    const supabase = getServiceSupabaseClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', tenantId)
      .single();

    let customerId = tenant?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          tenant_id: tenantId,
          user_id: userId,
        },
      });

      customerId = customer.id;

      // Update tenant with Stripe customer ID
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId);
    }

    // Get trial price ID from environment
    const trialPriceId = process.env.STRIPE_TRIAL_PRICE_ID;
    if (!trialPriceId) {
      return NextResponse.json(
        { error: 'Trial price not configured. Please set STRIPE_TRIAL_PRICE_ID environment variable.' },
        { status: 500 }
      );
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: trialPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
      metadata: {
        tenant_id: tenantId,
        user_id: userId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          tenant_id: tenantId,
        },
      },
    });

    // Redirect to Stripe Checkout
    return NextResponse.redirect(session.url!);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
