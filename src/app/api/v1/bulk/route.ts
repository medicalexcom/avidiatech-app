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

    // requireSubscriptionAndUsage expects a typed 'feature' value. Cast to any to stay compatible
    // with your billing helper's runtime checks while satisfying TypeScript here.
    await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      feature: "bulk" as any,
      increment: 1,
      userEmail,
    });

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
    return handleRouteError(err);
  }
}
