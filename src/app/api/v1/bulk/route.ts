// src/app/api/v1/bulk/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parsePastedUrls } from "@/lib/bulk/parse";
import { createBulkJob } from "@/lib/bulk/db";
import { handleRouteError, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { getQueue } from "@/lib/queue/bull";

/**
 * POST /api/v1/bulk
 *
 * Accepts JSON: { name?, pasted?: string, items?: [{ url, metadata }] }
 * Creates a bulk job and enqueues a bulk-master job.
 *
 * NOTE: We do NOT run requireSubscriptionAndUsage here to avoid blocking the UI.
 *       Billing and quota enforcement happens per-item inside the worker.
 */
export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);

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

    // Create job quickly; do not perform subscription/usage check here.
    // Workers will perform usage checks and increment usage as they process items.
    const bulkJobId = await createBulkJob({
      orgId: payload?.orgId ?? null,
      name,
      createdBy: userId,
      options: { ...options, source_tenant: tenantFromRequest(request) ?? null, requested_by_email: userEmail },
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
