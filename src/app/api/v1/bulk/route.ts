// src/app/api/v1/bulk/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parsePastedUrls } from "@/lib/bulk/parse";
import { createBulkJob } from "@/lib/bulk/db";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { getQueue } from "@/lib/queue/bull";

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      feature: "bulk",
      increment: 1,
      userEmail,
    });

    // Accept content-type application/json or multipart/form-data (paste text in JSON)
    const contentType = request.headers.get("content-type") || "";

    let payload: any = null;
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      // Fallback: try parse text body
      const text = await request.text();
      // try JSON first
      try {
        payload = JSON.parse(text || "{}");
      } catch {
        payload = { pasted: text };
      }
    }

    const name = payload?.name ?? `bulk-${new Date().toISOString()}`;
    const options = payload?.options ?? {};
    const pasted = payload?.pasted ?? payload?.text ?? null;
    const itemsFromBody = Array.isArray(payload?.items) ? payload.items.map((it: any) => ({ input_url: it.url || it.input_url, metadata: it.metadata || {} })) : [];

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
