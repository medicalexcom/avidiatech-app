import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getServiceSupabaseClient } from '@/lib/supabase';
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from '@/lib/billing';
import { HttpError } from '@/lib/errors';

/**
 * API route for listing, creating and revoking API keys. Requires an
 * authenticated Clerk user. Tenant context is resolved from the current
 * membership, optionally filtered by a provided tenant_id or x-tenant-id.
 */
export async function GET(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
    });

    if (context.role === 'member') {
      throw new HttpError(403, 'Only owners or admins can view API keys.');
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, prefix, last_used_at, revoked_at, created_at')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ keys: data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
    });

    if (context.role !== 'owner') {
      throw new HttpError(403, 'Only owners can create API keys.');
    }

    const body = await request.json();
    const { name } = body as { name?: string };
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const prefix = Math.random().toString(36).substring(2, 8);
    const secret = crypto.randomUUID().replace(/-/g, '');
    const rawKey = `${prefix}.${secret}`;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedKey = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: context.tenantId,
        name,
        prefix,
        hashed_key: hashedKey,
      })
      .select('id, name, prefix, created_at');

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ key: rawKey, meta: data?.[0] });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
    });

    if (context.role !== 'owner') {
      throw new HttpError(403, 'Only owners can revoke API keys.');
    }

    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', context.tenantId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
