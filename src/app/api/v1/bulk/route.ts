import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parsePastedUrls } from "@/lib/bulk/parse";
import { createBulkJob } from "@/lib/bulk/db";
import { handleRouteError, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { getQueue } from "@/lib/queue/bull";
import { resolveTenantIdForServerRequest } from "@/lib/tenancy/resolveTenantIdForServerRequest";

/**
 * POST /api/v1/bulk
 *
 * Accepts JSON: { name?, pasted?: string, items?: [{ url, metadata }], options?: any, orgId? }
 * Creates a bulk job and enqueues a bulk‑master job.
 *
 * NOTE: We do NOT run requireSubscriptionAndUsage here to avoid blocking the UI.
 *       Billing and quota enforcement happens per‑item inside the worker.
 *
 * Tenant hardening (2026‑01):
 *  - Always resolve a real tenant UUID and persist it to bulk_jobs.org_id.
 *  - If you pass orgId in the request body, it will be validated and used only if
 *    the caller belongs to that tenant.  Otherwise, the Clerk organization mapping
 *    will be used.  Requests without a resolvable tenant will fail with a 422.
 *  - createBulkJob requires a non‑null orgId and will throw if no tenant is resolved.
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
    const optionsFromBody = payload?.options ?? {};
    const pasted = payload?.pasted ?? payload?.text ?? null;
    const itemsFromBody = Array.isArray(payload?.items)
      ? payload.items.map((it: any) => ({ input_url: it.url || it.input_url, metadata: it.metadata || {} }))
      : [];

    let items = itemsFromBody;
    if (pasted && typeof pasted === "string") {
      items = items.concat(parsePastedUrls(pasted));
    }
    if (!items.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

    // Default bulk pipeline mode to "full" so items go through audit like single‑run URLs.
    const mode =
      typeof optionsFromBody?.mode === "string" && optionsFromBody.mode.trim()
        ? String(optionsFromBody.mode).trim()
        : "full";

    // Resolve tenant for this request (strict)
    // - optional payload.orgId is accepted if it's a UUID
    // - otherwise uses Clerk orgId -> tenants.id mapping
    const resolved = await resolveTenantIdForServerRequest(request, {
      requestedTenantId: payload?.orgId ?? null,
    });

    if (!resolved.tenantId) {
      return NextResponse.json(
        {
          error: "missing_tenant",
          detail:
            "Could not resolve tenant for bulk job creation. Ensure you are in a Clerk org and tenants mapping exists.",
          orgId: resolved.clerkOrgId ?? null,
        },
        { status: 422 }
      );
    }
    const tenantId = resolved.tenantId;
    const options = {
      ...optionsFromBody,
      mode,
      // Keep the old helper as a fallback signal, but prefer the canonical resolved tenant
      source_tenant: tenantId ?? tenantFromRequest(request) ?? null,
      requested_by_email: userEmail,
    };
    const bulkJobId = await createBulkJob({
      orgId: tenantId,
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
