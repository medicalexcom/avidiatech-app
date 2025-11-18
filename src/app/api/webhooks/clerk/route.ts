import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { ensureTenantFromProfile } from '@/lib/tenant';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'CLERK_WEBHOOK_SECRET is not configured. Add it to enable Clerk webhooks.' },
      { status: 500 },
    );
  }

  const payload = await req.text();
  const headerList = await headers();

  const svixHeaders = {
    'svix-id': headerList.get('svix-id') ?? '',
    'svix-timestamp': headerList.get('svix-timestamp') ?? '',
    'svix-signature': headerList.get('svix-signature') ?? '',
  };

  let evt: WebhookEvent;
  try {
    evt = new Webhook(WEBHOOK_SECRET).verify(payload, svixHeaders) as WebhookEvent;
  } catch (err) {
    console.error('Invalid Clerk webhook signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data as any;
  const userId = data?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Missing user id in webhook payload' }, { status: 400 });
  }

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      await ensureTenantFromProfile({
        userId,
        fullName: `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim() || null,
        email: data?.email_addresses?.[0]?.email_address ?? null,
        role: 'owner',
        active: true,
      });
    }

    if (eventType === 'user.deleted') {
      await ensureTenantFromProfile({
        userId,
        fullName: null,
        email: null,
        active: false,
      });
    }
  } catch (err) {
    console.error('Failed to sync Clerk user to Supabase tenant', err);
    return NextResponse.json({ error: 'Failed to sync tenant data' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
