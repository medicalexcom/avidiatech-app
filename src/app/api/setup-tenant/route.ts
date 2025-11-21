import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServiceSupabaseClient } from '@/lib/supabase';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { TRIAL_PERIOD_DAYS, DEFAULT_QUOTAS } from '@/lib/config';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST() {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    if (!userEmail || !isValidEmail(userEmail)) {
      return NextResponse.json({ error: 'Valid email not found in session' }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    let userDbId: string;

    if (existingUser) {
      userDbId = existingUser.id;
    } else {
      // Create user record
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: userId,
          email: userEmail,
        })
        .select('id')
        .single();

      if (userError || !newUser) {
        console.error('Error creating user:', userError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }

      userDbId = newUser.id;
    }

    // Check if user already has a tenant membership
    const { data: existingMembership } = await supabase
      .from('team_members')
      .select('tenant_id')
      .eq('user_id', userDbId)
      .limit(1)
      .single();

    if (existingMembership) {
      // User already has a tenant, return it
      return NextResponse.json({ 
        tenantId: existingMembership.tenant_id,
        message: 'Existing tenant found'
      });
    }

    // Create a new tenant
    const emailLocalPart = userEmail.split('@')[0] || 'user';
    const tenantName = `${emailLocalPart}'s Workspace`;
    const tenantSlug = `${emailLocalPart}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: tenantSlug,
      })
      .select('id')
      .single();

    if (tenantError || !newTenant) {
      console.error('Error creating tenant:', tenantError);
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    // Create team membership (owner role)
    const { error: membershipError } = await supabase
      .from('team_members')
      .insert({
        tenant_id: newTenant.id,
        user_id: userDbId,
        role: 'owner',
      });

    if (membershipError) {
      console.error('Error creating team membership:', membershipError);
      return NextResponse.json({ error: 'Failed to create team membership' }, { status: 500 });
    }

    // Create initial subscription record (trial status)
    const trialEndDate = new Date(Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const { error: subscriptionError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: newTenant.id,
        plan_name: 'trial',
        status: 'trialing',
        current_period_end: trialEndDate.toISOString(),
        ingestion_quota: DEFAULT_QUOTAS.TRIAL.ingestion,
        seo_quota: DEFAULT_QUOTAS.TRIAL.seo,
        variant_quota: DEFAULT_QUOTAS.TRIAL.variants,
        match_quota: DEFAULT_QUOTAS.TRIAL.match,
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      // Don't fail the request if subscription creation fails
    }

    return NextResponse.json({
      tenantId: newTenant.id,
      message: 'Tenant created successfully',
    });
  } catch (error) {
    console.error('Setup tenant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
