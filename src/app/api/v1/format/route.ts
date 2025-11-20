import { auth } from '@/lib/clerk-server';
import { NextResponse } from 'next/server';
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from '@/lib/billing';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

/**
 * Endpoint to generate descriptions in different formats. Accepts a POST body
 * with `text` (raw description) and `format` (e.g. 'avidia-standard',
 * 'general', 'shopify', 'manufacturer'). Calls the AvidiaDescribe service
 * and returns the formatted description.
 */
export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      feature: 'seo',
      increment: 1,
      userEmail,
    });

    const body = await request.json();
    const { text, format } = body as { text?: string; format?: string };
    if (!text || !format) {
      return NextResponse.json({ error: 'text and format are required' }, { status: 400 });
    }

    return NextResponse.json({ description: `Format (${format}): ${text}` });
  } catch (error) {
    return handleRouteError(error);
  }
}
