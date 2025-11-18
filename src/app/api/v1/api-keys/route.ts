import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

/**
 * API route for listing, creating and revoking API keys.
 *
 * Supported methods:
 *  - GET: List API keys for a tenant.  Accepts `tenant_id` as a query param.
 *  - POST: Create a new API key.  Requires JSON body { tenant_id, name }.
 *    Returns the plaintext key once.  Only owners should call this route.
 *  - DELETE: Revoke an API key.  Requires JSON body { id }.
 */

export async function GET(request: Request) {
  const supabase = getServiceClient();
  if (supabase instanceof NextResponse) return supabase;

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id query param is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, prefix, last_used_at, revoked_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (supabase instanceof NextResponse) return supabase;

  try {
    const body = await request.json();
    const { tenant_id, name } = body as { tenant_id?: string; name?: string };
    if (!tenant_id || !name) {
      return NextResponse.json({ error: 'tenant_id and name are required' }, { status: 400 });
    }
    // Generate a random prefix and secret.  The full key is `prefix.secret`.
    const prefix = Math.random().toString(36).substring(2, 8);
    const secret = crypto.randomUUID().replace(/-/g, '');
    const rawKey = `${prefix}.${secret}`;
    // Hash the secret portion with SHA-256.  We never store the plaintext secret.
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedKey = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase.from('api_keys').insert({
      tenant_id,
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

  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}
