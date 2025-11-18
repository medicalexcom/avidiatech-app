import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveTenantContext } from '@/lib/tenant';

function getServiceClient(): SupabaseClient | NextResponse<{ error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      error: 'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are required.',
    }, { status: 500 });
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function tenantFromRequest(request: Request): Promise<string | NextResponse> {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  if (tenantId) return tenantId;
  try {
    const ctx = await resolveTenantContext();
    return ctx.tenantId;
  } catch (err: any) {
    if (err instanceof Response) return err as unknown as NextResponse;
    return NextResponse.json({ error: 'Unable to resolve tenant' }, { status: 401 });
  }
}

/**
 * API route for listing, creating and revoking API keys with tenant scoping.
 */

export async function GET(request: Request) {
  const supabase = getServiceClient();
  if (supabase instanceof NextResponse) return supabase;

  const tenant = await tenantFromRequest(request);
  if (tenant instanceof NextResponse) return tenant;

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, prefix, last_used_at, revoked_at, created_at')
    .eq('tenant_id', tenant)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (supabase instanceof NextResponse) return supabase;

  const tenant = await tenantFromRequest(request);
  if (tenant instanceof NextResponse) return tenant;

  try {
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

    const { data, error } = await supabase.from('api_keys').insert({
      tenant_id: tenant,
      name,
      prefix,
      hashed_key: hashedKey,
    }).select('id, name, prefix, created_at');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ key: rawKey, meta: data?.[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const supabase = getServiceClient();
  if (supabase instanceof NextResponse) return supabase;

  const tenant = await tenantFromRequest(request);
  if (tenant instanceof NextResponse) return tenant;

  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
