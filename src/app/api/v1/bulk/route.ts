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
 * Tenant hardening (2026‑01):
 *  - Always resolve a real tenant UUID and persist it to bulk_jobs.org_id.
 *  - If you pass orgId in the request body, it will be validated and used only if
 *    the caller belongs to that tenant.  Otherwise, the Clerk organization mapping
 *    will be used. Requests without a resolvable tenant will fail with a 422.
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

    // If we couldn't resolve a tenant, fail early with a clear 422 (do NOT attempt DB insert)
    if (!resolved.tenantId) {
      return NextResponse.json(
        {
          error: "missing_tenant",
          detail:
            "Could not determine tenant for this bulk request. Provide a valid orgId or ensure your Clerk org is linked to a tenant.",
        },
        { status: 422 }
      );
    }

    const orgId = resolved.tenantId;
    const createdBy = userId;

    // Build items into expected BulkInputItem[] shape (db.createBulkJob will validate)
    const sanitizedItems = items.map((it: any) => ({
      input_url: it.input_url ?? it.url ?? null,
      metadata: it.metadata ?? {},
      idempotency_key: it.idempotency_key ?? null,
    }));

    // Create the bulk job (createBulkJob enforces non-null orgId)
    let bulkJobId: string;
    try {
      bulkJobId = await createBulkJob({
        orgId,
        name,
        createdBy,
        options: { ...optionsFromBody, mode, source_tenant: payload?.orgId ?? null },
        items: sanitizedItems,
      });
    } catch (err: any) {
      console.error("createBulkJob failed", err);
      // If createBulkJob threw due to missing orgId or validation, surface a 422
      if (String(err?.message || "").toLowerCase().includes("orgid") || String(err?.message || "").toLowerCase().includes("org_id")) {
        return NextResponse.json({ error: "missing_tenant_or_invalid_orgId", detail: String(err?.message ?? err) }, { status: 422 });
      }
      return NextResponse.json({ error: "create_bulk_job_failed", detail: String(err?.message ?? err) }, { status: 500 });
    }

    // Enqueue a master job to process items (best-effort)
    try {
      const q = getQueue("bulk-master");
      await q.add("bulk-master", { bulkJobId }, {});
    } catch (e) {
      console.warn("Failed to enqueue bulk-master job (worker queue issue)", e);
      // Still return success because job row exists; worker can be triggered later or retried.
    }

    return NextResponse.json({ ok: true, data: { bulkJobId } }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/bulk error", err);
    // Use centralized handler if available for consistent error shapes
    try {
      return handleRouteError(err);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
