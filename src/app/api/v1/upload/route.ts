import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from '@/lib/billing';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

/**
 * Endpoint for bulk file uploads. Accepts multipart/form-data with a single
 * file field named `file`. This route is a placeholder and should be
 * implemented to handle parsing of CSV/XLSX files and queuing ingestion jobs.
 */
export async function POST(request: Request) {
  const { userId, sessionClaims } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      feature: 'variants',
      increment: 1,
      userEmail,
    });

    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bulk upload endpoint not yet implemented' }, { status: 501 });
  } catch (error) {
    return handleRouteError(error);
  }
}
