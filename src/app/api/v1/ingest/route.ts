import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";
import { saveIngestion } from "@/lib/supabaseServer";
import { resolveTenantForInsert } from "@/lib/ingest/resolve-tenant";
import { createWatchForIngestion } from "@/lib/monitor/hooks";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

/**
 * Ingest route
 *
 * Policy updates (2025-12):
 * - Deprecate module toggles from the client. They were part of an older UI.
 * - Always run a full extract with specs enabled to support strict SEO/Describe compliance.
 * - If the request provides options, we will accept them ONLY for docs/variants/export_type,
 *   but we will FORCE includeSpecs=true whenever includeSeo=true (and in practice always).
 *
 * Behavior changes (2026-01):
 * - Enforce tenant resolution before creating product_ingestions rows.
 *   If tenant cannot be determined we return 422 instead of attempting an insert which triggers DB constraints.
 * - Prefer explicit tenantId in request body / pipeline payload / options.source_tenant.
 * - Fall back to profile-derived tenant only for non-internal (user) requests.
 *
 * Monitor changes (2026-01-13):
 * - If tenant.monitor_all is enabled (default true), best-effort create a monitor watch
 *   for every submitted URL immediately after ingestion row is created.
 * - Also best-effort run an initial watch check so last_status becomes ok/changed quickly.
 * - This must never block ingestion (errors swallowed).
 */

function normalizeBool(v: any): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function buildEffectiveOptions(body: any) {
  const export_type = body?.export_type || "JSON";

  // Keep fullExtract for backwards compatibility, but default true and treat toggles as deprecated.
  const fullExtract = body?.fullExtract === undefined ? true : normalizeBool(body?.fullExtract);

  const clientOptions = body?.options || {};

  // We no longer honor turning off SEO/specs via client toggles.
  // Always include SEO + Specs to match strict requirements downstream.
  const includeSeo = true;
  const includeSpecs = true;

  // Docs/Variants may remain optional because they can be expensive.
  const includeDocs = fullExtract ? true : normalizeBool(clientOptions.includeDocs);
  const includeVariants = fullExtract ? true : normalizeBool(clientOptions.includeVariants);

  const effectiveOptions = {
    includeSeo,
    includeSpecs,
    includeDocs,
    includeVariants,
  };

  return { effectiveOptions, fullExtract, export_type };
}

/**
 * Determine whether the incoming request is an allowed internal call.
 * We accept either:
 *  - x-pipeline-secret === process.env.PIPELINE_INTERNAL_SECRET
 *  - x-service-api-key  === process.env.SERVICE_API_KEY
 *
 * This is intentionally permissive for internal automation; no user session is required.
 */
function internalAuthOk(req: NextRequest) {
  const providedPipeline = (req.headers.get("x-pipeline-secret") || "").trim();
  const providedService = (req.headers.get("x-service-api-key") || "").trim();

  const expectPipeline = (process.env.PIPELINE_INTERNAL_SECRET || "").trim();
  const expectService = (process.env.SERVICE_API_KEY || "").trim();

  if (expectPipeline && providedPipeline && providedPipeline === expectPipeline) return true;
  if (expectService && providedService && providedService === expectService) return true;

  return false;
}

async function isMonitorAllEnabledForTenant(tenantId: string): Promise<boolean> {
  // Default ON if anything goes wrong (per requirement)
  try {
    const svc = getServiceSupabaseClient();
    const { data, error } = await svc.from("tenants").select("monitor_all").eq("id", tenantId).maybeSingle();
    if (error) return true;
    if (!data) return true;
    return data.monitor_all !== false;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  try {
    // DEBUG: do NOT log secret. Log only header presence/length to verify request reaches handler.
    console.log(
      "[ingest-debug] x-service-api-key length:",
      (req.headers.get("x-service-api-key") || "").length
    );

    const isInternalRequest = internalAuthOk(req);

    // parse body (be permissive about content type)
    let body: any = null;
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const txt = await req.text().catch(() => "");
      try {
        body = txt ? JSON.parse(txt) : {};
      } catch {
        body = { rawText: txt };
      }
    }
    body = body ?? {};

    // Basic engine config check
    if (!INGEST_ENGINE_URL || !INGEST_SECRET) {
      console.error("INGEST_ENGINE_URL or INGEST_SECRET not configured. Cannot start ingestion.");
      return NextResponse.json(
        {
          error: "ingest_engine_not_configured",
          detail: "INGEST_ENGINE_URL and INGEST_SECRET must be set in the server environment.",
        },
        { status: 500 }
      );
    }

    const url = (body?.url || "").toString();
    const correlation_id = body?.correlationId ?? `corr_${Date.now().toString()}`;

    if (!url) {
      return NextResponse.json({ error: "missing url" }, { status: 400 });
    }

    // Resolve tenant: priority chain
    // 1) explicit tenant in body (tenantId, tenant_id)
    // 2) pipeline payload / pipeline_payload fields
    // 3) options.source_tenant (bulk flow)
    // 4) for non-internal requests, profile lookup (existing behavior)
    // 5) for internal requests, do NOT silently inherit profile; require explicit tenant or fallback env
    let tenant_id: string | null = null;
    const explicitTenant =
      body?.tenantId ??
      body?.tenant_id ??
      body?.pipelinePayload?.tenantId ??
      body?.pipeline_payload?.tenant_id ??
      body?.options?.source_tenant ??
      null;
    if (explicitTenant) {
      tenant_id = String(explicitTenant);
    }

    // If not explicit, consult resolveTenantForInsert which checks pipelinePayload, body, authContext and an optional DEFAULT_FALLBACK_TENANT_ID env.
    // For internal calls we pass strict=false and will enforce presence below; for user calls we still consult auth via profile lookup below.
    if (!tenant_id) {
      try {
        const resolved = await resolveTenantForInsert({
          requestBody: body,
          pipelinePayload: body?.pipelinePayload ?? body?.pipeline_payload ?? null,
          authContext: null, // we don't have request auth available to helper here (profile lookup below)
          strict: false,
        });
        if (resolved) tenant_id = resolved;
      } catch {
        tenant_id = null;
      }
    }

    const supabase = getServiceSupabaseClient();

    // For non-internal requests, try profile lookup if tenant still missing (back-compat)
    let profileData: any = null;
    let role = "user";
    let userId: string | null = null;

    if (!isInternalRequest) {
      const auth = (safeGetAuth(req as any) as { userId?: string | null }) || {};
      userId = auth.userId ?? null;
      if (!userId) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }

      if (!tenant_id) {
        try {
          // Attempt to load profile row and extract tenant
          const { data: byClerk, error: clerkErr } = await supabase
            .from("profiles")
            .select("id, tenant_id, role")
            .eq("clerk_user_id", userId)
            .limit(1)
            .maybeSingle();

          if (!clerkErr && byClerk) {
            profileData = byClerk;
          } else {
            // fallback to legacy user_id column if clerk_user_id lookup fails due to schema
            const { data: byUser, error: userErr } = await supabase
              .from("profiles")
              .select("id, tenant_id, role")
              .eq("user_id", userId)
              .limit(1)
              .maybeSingle();

            if (!userErr && byUser) {
              profileData = byUser;
            } else if (clerkErr && String(clerkErr?.code) !== "42703") {
              // if lookup failed for other DB reasons surface error
              console.error("[ingest] profile lookup error", clerkErr);
              return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 });
            }
          }

          if (profileData) {
            tenant_id = tenant_id ?? (profileData.tenant_id ?? null);
            role = profileData.role ?? "user";
            console.info("[ingest] profile found", { correlation_id, profileId: profileData.id });
          } else {
            console.warn("[ingest] profile not found for user", { correlation_id, userId });
          }
        } catch (err: any) {
          console.error("[ingest] profile lookup failed", { correlation_id, err });
          return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 });
        }
      }
    } else {
      // internal requests: role=owner (bypass quotas), but tenant MUST be provided or resolved via resolveTenantForInsert fallback env
      role = "owner";
    }

    // Final enforcement: tenant must be present before creating product_ingestions
    if (!tenant_id) {
      // Do not attempt DB insert; return clear client error so callers can include tenant or we can backfill.
      return NextResponse.json(
        {
          error: "missing_tenant",
          detail:
            "Tenant could not be determined for this ingest request. Include tenantId in the request body or ensure the caller is associated with a tenant.",
        },
        { status: 422 }
      );
    }

    // Build effective options and diagnostics
    const { effectiveOptions, fullExtract, export_type } = buildEffectiveOptions(body);
    const flags = {
      full_extract: fullExtract,
      includeSeo: !!effectiveOptions.includeSeo,
      includeSpecs: !!effectiveOptions.includeSpecs,
      includeDocs: !!effectiveOptions.includeDocs,
      includeVariants: !!effectiveOptions.includeVariants,
    };

    const initialDiagnostics = {
      created_by: isInternalRequest ? "ingest-route-internal" : "ingest-route",
      created_at: new Date().toISOString(),
      engine_call: null,
    };

    // Use saveIngestion helper (centralized) which also enforces tenant presence and is consistent with other callers.
    let created: any = null;
    try {
      created = await saveIngestion({
        tenantId: tenant_id,
        type: export_type ?? "bulk",
        status: "pending",
        normalizedPayload: body.normalized_payload ?? body.normalizedPayload ?? null,
        rawPayload: body,
        userId: userId ?? null,
        sourceUrl: url ?? null,
      });
    } catch (err: any) {
      // saveIngestion will throw descriptive errors, including missing_tenant_id_for_ingestion
      const msg = String(err?.message ?? err);
      console.error("failed to create ingestion record via saveIngestion", { msg, correlation_id });
      if (msg.includes("missing_tenant")) {
        return NextResponse.json({ error: "missing_tenant", detail: msg }, { status: 422 });
      }
      return NextResponse.json({ error: "db_insert_failed", detail: msg }, { status: 500 });
    }

    const ingestionId = created?.id ?? (created?.data?.id ?? null);
    if (!ingestionId) {
      console.error("saveIngestion returned no id", { created, correlation_id });
      return NextResponse.json({ error: "db_insert_failed", detail: "no id returned" }, { status: 500 });
    }

    const jobId = ingestionId;
    const callbackUrl = `${APP_URL}/api/v1/ingest/callback`;

    // Best-effort: if supabase client available update job_id and diagnostics via service client to preserve existing behavior
    try {
      // update diagnostics and job_id using service client (so RLS/role issues avoided)
      const svc = getServiceSupabaseClient();
      await svc
        .from("product_ingestions")
        .update({
          job_id: jobId,
          diagnostics: {
            ...(created?.diagnostics || initialDiagnostics),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestionId);
    } catch (e) {
      // warn but continue
      console.warn("failed to update job_id/diagnostics after saveIngestion", e);
    }

    // Auto-monitor: create watch + run initial check (non-blocking)
    (async () => {
      try {
        const enabled = await isMonitorAllEnabledForTenant(String(tenant_id));
        if (!enabled) return;

        await createWatchForIngestion({
          source_url: url,
          product_id: String(ingestionId),
          tenant_id: String(tenant_id),
          created_by: userId ?? null,
          frequency_seconds: null,
          run_initial_check: true, // NEW: makes watch status update quickly
        });
      } catch (e: any) {
        console.warn("[ingest] createWatchForIngestion failed (non-blocking):", String(e?.message ?? e));
      }
    })();

    const payload = {
      correlation_id,
      job_id: jobId,
      tenant_id,
      url,
      options: effectiveOptions,
      export_type: export_type ?? "JSON",
      callback_url: callbackUrl,
      action: "ingest",
    };

    let engineDiagnostics: any = {
      attempted_at: new Date().toISOString(),
      engine_url: INGEST_ENGINE_URL,
      attempted_payload_summary: {
        job_id: jobId,
        url,
        options: effectiveOptions,
        callback_url: callbackUrl,
      },
    };

    try {
      const signature = signPayload(JSON.stringify(payload), INGEST_SECRET);

      const res = await fetch(INGEST_ENGINE_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avidiatech-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      console.info("[ingest] engine call status=", res.status, "body=", text);

      engineDiagnostics = {
        ...engineDiagnostics,
        statusCode: res.status,
        responseBody: text,
      };

      if (!res.ok) {
        console.warn("ingest engine responded non-OK", res.status, text || "<empty>");
      } else {
        // mark as processing if engine accepted the job
        try {
          const svc = getServiceSupabaseClient();
          await svc
            .from("product_ingestions")
            .update({
              status: "processing",
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", ingestionId);
        } catch (statusErr) {
          console.warn("failed to update status to processing", statusErr?.message ?? statusErr);
        }
      }
    } catch (err) {
      console.error("failed to call ingest engine", err);
      engineDiagnostics = {
        ...engineDiagnostics,
        error: String(err),
      };
    }

    // Persist engine_call diagnostics — if THIS fails return 500
    try {
      const svc = getServiceSupabaseClient();
      const { error: diagErr } = await svc
        .from("product_ingestions")
        .update({
          diagnostics: {
            ...(created?.diagnostics || initialDiagnostics),
            engine_call: engineDiagnostics,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestionId);

      if (diagErr) {
        console.error("failed to persist engine_call diagnostics", diagErr.message || String(diagErr));
        return NextResponse.json(
          {
            error: "diagnostics_update_failed",
            detail: diagErr.message || String(diagErr),
          },
          { status: 500 }
        );
      }
    } catch (e) {
      console.error("failed to persist diagnostics (unexpected)", e);
      return NextResponse.json({ error: "diagnostics_update_failed", detail: String(e) }, { status: 500 });
    }

    return NextResponse.json({ ingestionId, jobId, status: "accepted" }, { status: 202 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest error:", err);
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
