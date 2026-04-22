import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from '@/lib/billing';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

/**
 * Endpoint for bulk file uploads. Accepts multipart/form-data with a single
 * file field named `file`.
 *
 * Feature-gated: this route is disabled unless ENABLE_V1_UPLOAD_ROUTE=true.
 */
export async function POST(request: Request) {
  if (process.env.ENABLE_V1_UPLOAD_ROUTE !== "true") {
    return NextResponse.json(
      { error: "feature_disabled", detail: "v1_upload_route_disabled" },
      { status: 404 }
    );
  }

  const { userId, sessionClaims } = await auth();
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
