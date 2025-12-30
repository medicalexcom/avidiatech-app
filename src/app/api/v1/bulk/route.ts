// src/app/api/v1/bulk/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parsePastedUrls } from "@/lib/bulk/parse";
import { createBulkJob } from "@/lib/bulk/db";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { getQueue } from "@/lib/queue/bull";

/**
 * POST /api/v1/bulk
 *
 * Accepts JSON: { name?, pasted?: string, items?: [{ url, metadata }] }
 * Creates a bulk job and enqueues a bulk-master job.
 */
export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);

    // Defensive billing check: try to require subscription/usage, but surface a clear error
    try {
      // cast to any to avoid strict UsageFeature typing mismatches
      await requireSubscriptionAndUsage({
        userId,
        requestedTenantId: tenantFromRequest(request),
        feature: "bulk" as any,
        increment: 1,
        userEmail,
      });
    } catch (billingErr: any) {
      // Log full server-side error for debugging
      console.error("Billing/requireSubscriptionAndUsage failed for bulk create:", billingErr);

      // If we're in development, allow bypass for convenience (OPTIONAL)
      if (process.env.NODE_ENV !== "production") {
        console.warn("Bypassing billing check in non-production environment.");
      } else {
        // Return a clear error for operators
        return NextResponse.json(
          {
            error: "billing_check_failed",
            message:
              "Billing/subscription check failed while creating bulk job. Ensure billing tables (team_members etc.) and migrations are applied and environment variables are configured.",
            details: String(billingErr?.message ?? billingErr),
          },
          { status: 503 }
        );
      }
    }

    const contentType = request.headers.get("content-type") || "";
    let payload: any = null;

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text || "{}");
      } catch {
        payload = { pasted: text };
      }
    }

    const name = payload?.name ?? `bulk-${new Date().toISOString()}`;
    const options = payload?.options ?? {};
    const pasted = payload?.pasted ?? payload?.text ?? null;
    const itemsFromBody = Array.isArray(payload?.items)
      ? payload.items.map((it: any) => ({ input_url: it.url || it.input_url, metadata: it.metadata || {} }))
      : [];

    let items = itemsFromBody;
    if (pasted && typeof pasted === "string") {
      items = items.concat(parsePastedUrls(pasted));
    }

    if (!items.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

    const bulkJobId = await createBulkJob({
      orgId: payload?.orgId ?? null,
      name,
      createdBy: userId,
      options,
      items,
    });

    // enqueue master job
    const q = getQueue("bulk-master");
    await q.add("bulk-master", { bulkJobId }, { attempts: 3 });

    return NextResponse.json({ ok: true, bulkJobId });
  } catch (err) {
    // Use your generic error handler if available
    return handleRouteError(err);
  }
}
