import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env. INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const APP_VERSION = process.env.APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || "unknown";

/**
 * Ingest route
 *
 * Policy updates (2025-12):
 * - Deprecate module toggles from the client.  They were part of an older UI.
 * - Always run a full extract with specs enabled to support strict SEO/Describe compliance.
 * - If the request provides options, we will accept them ONLY for docs/variants/export_type,
 *   but we will FORCE includeSpecs=true whenever includeSeo=true (and in practice always).
 *
 * Why: 
 * - The SEO/Describe instruction contract forbids placeholders and hallucination.
 * - If specs are not extracted upstream, the model cannot legally generate Product Specifications.
 * - Previously, includeSeo=true with includeSpecs=false caused url-derived product names and
 *   "Not specified" spec placeholders (invalid).
 *
 * 2026-01-11: org_id NOT NULL fix
 * - Always include org_id in product_ingestions insert (derived from tenant_id)
 * - Fail fast if org_id cannot be derived
 * - Add structured logging before insert to identify code path
 * - Add version header (x-app-version) for deployment tracking
 */

function normalizeBool(v: any): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function buildEffectiveOptions(body: any) {
  const export_type = body?. export_type || "JSON";

  // Keep fullExtract for backwards compatibility, but default true and treat toggles as deprecated. 
  const fullExtract = body?.fullExtract === undefined ? true : normalizeBool(body?.fullExtract);

  const clientOptions = body?.options || {};

  // We no longer honor turning off SEO/specs via client toggles.
  // Always include SEO + Specs to match strict requirements downstream.
  const includeSeo = true;
  const includeSpecs = true;

  // Docs/Variants may remain optional because they can be expensive.
  const includeDocs = fullExtract ?  true : normalizeBool(clientOptions. includeDocs);
  const includeVariants = fullExtract ?  true : normalizeBool(clientOptions.includeVariants);

  const effectiveOptions = {
    includeSeo,
    includeSpecs,
    includeDocs,
    includeVariants,
  };

  return { effectiveOptions, fullExtract, export_type };
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: NextRequest) {
  try {
    // DEBUG: do NOT log secret.  Log only header presence/length to verify request reaches handler.
    console.log(
      "[ingest-debug] x-service-api-key length:",
      (req.headers.get("x-service-api-key") || "").length
    );

    // Check for service-key based internal requests first. 
    const serviceKey = (req.headers.get("x-service-api-key") || "").toString();
    const isInternalRequest =
      !!serviceKey &&
      !!process.env.PIPELINE_INTERNAL_SECRET &&
      serviceKey === process.env.PIPELINE_INTERNAL_SECRET;

    if (isInternalRequest) {
      console.info("[ingest-debug] internal request authenticated via service key");
    }

    // Declare profile-related variables up-front so both branches can set them.
    let profileData: any = null;
    let tenant_id: string | null = null;
    let org_id:  string | null = null;
    let role: string = "user";
    let userId: string | null = null;

    if (! isInternalRequest) {
      // Normal authenticated user path via Clerk
      const auth = (safeGetAuth(req as any) as { userId?:  string | null }) || {};
      userId = auth.userId ??  null;

      if (! userId) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }
    } else {
      // Internal request:  allow explicit tenant_id AND org_id from trusted callers (bulk worker, scripts, etc.)
      const bodyPeek = (await req.json().catch(() => ({}))) as any;
      const providedTenant = String(bodyPeek?.tenant_id ??  bodyPeek?.tenantId ??  "").trim();
      const providedOrgId = String(bodyPeek?.org_id ?? bodyPeek?.orgId ?? "").trim();

      if (providedTenant && isUuid(providedTenant)) {
        tenant_id = providedTenant;
        org_id = providedOrgId && isUuid(providedOrgId) ? providedOrgId : providedTenant;
      } else if (providedOrgId && isUuid(providedOrgId)) {
        tenant_id = providedOrgId;
        org_id = providedOrgId;
      } else {
        tenant_id = null;
        org_id = null;
      }

      // Recreate the request body stream by storing parsed body
      // We'll use bodyPeek as body below. 
      // (NextRequest body is a stream; re-reading req.json() later would fail.)
      // So we keep bodyPeek in a variable and skip re-reading. 
      const body = bodyPeek;

      profileData = {
        id: `internal_${Date.now()}`,
        tenant_id,
        org_id,
        role:  "owner",
        _temporary:  true,
        clerk_user_id: null,
        user_id: null,
      };
      role = "owner";
      userId = null;

      // Hard fail if tenant_id or org_id is missing:  prevents db_insert_failed under NOT NULL enforcement.
      if (!tenant_id || !org_id) {
        return NextResponse.json(
          {
            error: "missing_tenant_id_or_org_id_for_internal_ingest",
            detail: "Internal ingest requests must include tenant_id and org_id (UUID).",
          },
          { status: 422 }
        );
      }

      // Continue with shared logic using `body`
      return await handleIngestWithParsedBody({
        req,
        isInternalRequest,
        profileData,
        tenant_id,
        org_id,
        role,
        userId,
        body,
      });
    }

    // Non-internal path: parse body normally
    const body = (await req.json().catch(() => ({}))) as any;
    return await handleIngestWithParsedBody({
      req,
      isInternalRequest,
      profileData,
      tenant_id,
      org_id,
      role,
      userId,
      body,
    });
  } catch (err: any) {
    console.error("POST /api/v1/ingest error:", err);
    return NextResponse. json({ error: err?. message || "internal_error" }, { status: 500 });
  }
}

async function handleIngestWithParsedBody(opts: {
  req: NextRequest;
  isInternalRequest:  boolean;
  profileData: any;
  tenant_id: string | null;
  org_id: string | null;
  role: string;
  userId: string | null;
  body: any;
}) {
  const { isInternalRequest, profileData } = opts;
  let { tenant_id, org_id, role, userId } = opts;
  const body = opts.body;

  // Hard fail if the ingest engine is not configured.
  if (!INGEST_ENGINE_URL || !INGEST_SECRET) {
    console.error("INGEST_ENGINE_URL or INGEST_SECRET not configured.  Cannot start ingestion.");
    return NextResponse. json(
      {
        error: "ingest_engine_not_configured",
        detail: "INGEST_ENGINE_URL and INGEST_SECRET must be set in the server environment.",
      },
      { status: 500 }
    );
  }

  const url = (body?.url || "").toString();
  const export_type = body?.export_type || "JSON";
  const correlation_id = body?.correlationId || `corr_${Date.now().toString()}`;

  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let supabase: any;
  try {
    supabase = getServiceSupabaseClient();
  } catch (err:  any) {
    console.error("Supabase configuration missing", err?. message || err);
    return NextResponse. json({ error: "server_misconfigured_supabase" }, { status: 500 });
  }

  // If not internal, perform profile lookup (DB) to derive tenant_id and role. 
  if (!isInternalRequest) {
    try {
      // First, attempt to look up by clerk_user_id (most common)
      const byClerk = await supabase
        .from("profiles")
        .select("id, tenant_id, role")
        .eq("clerk_user_id", userId)
        .limit(1)
        .maybeSingle();

      if (! byClerk. error) {
        (opts as any).profileData = byClerk.data ??  null;
      } else {
        // If clerk_user_id column doesn't exist (or other DB error), try user_id
        const errMsg = String(byClerk.error?.message ??  "");
        const isMissingCol =
          String(byClerk.error?.code) === "42703" ||
          errMsg.includes("does not exist") ||
          errMsg.includes("Could not find the table");

        if (isMissingCol) {
          // Try the legacy column name user_id
          const byUser = await supabase
            .from("profiles")
            .select("id, tenant_id, role")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (!byUser.error) {
            (opts as any).profileData = byUser.data ?? null;
          } else {
            // byUser also errored — rethrow so outer catch handles missing-table vs other errors
            throw byUser. error;
          }
        } else {
          // Some other DB error when querying clerk_user_id — rethrow
          throw byClerk.error;
        }
      }

      if ((opts as any).profileData) {
        tenant_id = (opts as any).profileData.tenant_id ??  null;
        org_id = tenant_id; // Derive org_id from tenant_id
        role = (opts as any).profileData.role ?? "user";
        console.info("[ingest] profile found", { correlation_id, profileId: (opts as any).profileData.id });
      } else {
        // No matching profile row
        console.warn("[ingest] profile not found for user", { correlation_id, userId });
      }
    } catch (err:  any) {
      // Detect PostgREST schema/cache error (missing table) or column issues
      const isPgrstMissingTable =
        err &&
        (err.code === "PGRST205" || (typeof err. message === "string" && err.message.includes("Could not find the table")));

      const isColumnMissing =
        err && (String(err.code) === "42703" || (typeof err.message === "string" && err.message.includes("does not exist")));

      console.error("[ingest] profile lookup failed", { correlation_id, err });

      if (isPgrstMissingTable || isColumnMissing) {
        const allowFallback = String(process.env.ALLOW_PROFILE_FALLBACK ??  "false").toLowerCase() === "true";

        if (! allowFallback) {
          console.warn("[ingest] profiles table/column missing and fallback disabled.  Aborting.");
          return NextResponse.json(
            {
              error: "profile_lookup_failed",
              detail: isPgrstMissingTable
                ? "profiles table missing in DB (PGRST205)"
                : "profiles table missing expected column",
            },
            { status:  500 }
          );
        }

        // Build a minimal temporary profile object from the Clerk session (best-effort).
        const tempProfile = {
          id: `tmp_${userId}`,
          tenant_id: null,
          org_id: null,
          clerk_user_id: userId,
          user_id: userId,
          role: "owner",
          _temporary: true,
        };
        (opts as any).profileData = tempProfile;
        tenant_id = null;
        org_id = null;
        role = tempProfile.role;
        console.warn("[ingest] using temporary fallback profile due to missing table/column", {
          correlation_id,
          tempProfileId: tempProfile.id,
        });
      } else {
        return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 });
      }
    }

    if (!(opts as any).profileData) {
      console.warn("[ingest] profile not found and no fallback available", { correlation_id, userId });
      return NextResponse. json({ error: "profile_lookup_failed" }, { status: 500 });
    }
  }

  // Defensive guard:  fail fast if org_id is missing
  if (! org_id) {
    console.error("[ingest] org_id is null - cannot insert product_ingestion", {
      tenant_id,
      org_id,
      correlation_id,
    });
    return NextResponse. json(
      {
        error: "missing_org_id",
        detail: "org_id is required to create product_ingestion rows.  Cannot proceed.",
      },
      { status: 422 }
    );
  }

  // Quota check (if applicable) — internal requests have role "owner" so they bypass this.
  if (role !== "owner") {
    const { data:  counters } = await supabase
      .from("usage_counters")
      .select("*")
      .eq("tenant_id", tenant_id)
      .limit(1)
      .maybeSingle();

    if (counters && typeof counters. ingest_calls === "number") {
      const monthlyLimit = process.env.DEFAULT_MONTHLY_INGEST_LIMIT ?  parseInt(process.env.DEFAULT_MONTHLY_INGEST_LIMIT, 10) : 1000;

      if (counters.ingest_calls >= monthlyLimit) {
        return NextResponse.json({ error: "quota_exceeded" }, { status: 402 });
      }
    }
  }

  const { effectiveOptions, fullExtract } = buildEffectiveOptions(body);

  const flags = {
    full_extract: fullExtract,
    includeSeo: !!effectiveOptions.includeSeo,
    includeSpecs:  !!effectiveOptions.includeSpecs,
    includeDocs: !!effectiveOptions.includeDocs,
    includeVariants: !!effectiveOptions. includeVariants,
  };

  const initialDiagnostics = {
    created_by: isInternalRequest ? "ingest-route-internal" : "ingest-route",
    created_at: new Date().toISOString(),
    engine_call:  null,
  };

  // STRUCTURED LOG: identify insertion point before DB insert
  console.log("[ingest-insert-log]", JSON.stringify({
    route: "/api/v1/ingest",
    file: "src/app/api/v1/ingest/route.ts",
    tenant_id,
    org_id,
    user_id: userId,
    source_url: url,
    app_version: APP_VERSION,
    environment: process.env.NODE_ENV || process.env.VERCEL_ENV || "unknown",
    correlation_id,
    timestamp: new Date().toISOString(),
  }));

  const insert = {
    tenant_id,
    org_id, // CRITICAL FIX: always include org_id
    user_id: userId,
    source_url: url,
    status: "pending",
    options: effectiveOptions,
    flags,
    export_type,
    correlation_id,
    diagnostics: initialDiagnostics,
    created_at: new Date().toISOString(),
  };

  const { data: created, error:  insertError } = await supabase. from("product_ingestions").insert(insert).select("*").single();

  if (insertError || !created) {
    console.error("failed to create ingestion record", insertError);
    return NextResponse. json({ error: "db_insert_failed", detail: insertError?.message ??  null }, { status: 500 });
  }

  const ingestionId = created.id;
  const jobId = ingestionId;
  const callbackUrl = `${APP_URL}/api/v1/ingest/callback`;

  try {
    const { error: jobErr } = await supabase
      .from("product_ingestions")
      .update({ job_id: jobId, updated_at: new Date().toISOString() })
      .eq("id", ingestionId);

    if (jobErr) {
      console.warn("job_id update failed (column may not exist or RLS issue)", jobErr.message || jobErr);
    }
  } catch (e) {
    console.warn("job_id update threw", e);
  }

  const payload = {
    correlation_id,
    job_id: jobId,
    tenant_id,
    org_id, // Forward org_id to engine
    url,
    options: effectiveOptions,
    export_type,
    callback_url: callbackUrl,
    action: "ingest",
  };

  let engineDiagnostics:  any = {
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
      headers:  {
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

    if (! res.ok) {
      console.warn("ingest engine responded non-OK", res.status, text || "<empty>");
    } else {
      const { error: statusErr } = await supabase
        .from("product_ingestions")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestionId);

      if (statusErr) {
        console.warn("failed to update status to processing", statusErr.message || statusErr);
      }
    }
  } catch (err) {
    console.error("failed to call ingest engine", err);
    engineDiagnostics = {
      ...engineDiagnostics,
      error: String(err),
    };
  }

  const { error: diagErr } = await supabase
    .from("product_ingestions")
    .update({
      diagnostics: {
        .. .(created. diagnostics || {}),
        engine_call: engineDiagnostics,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ingestionId);

  if (diagErr) {
    console.error("failed to persist engine_call diagnostics", diagErr. message || String(diagErr));
    return NextResponse.json(
      {
        error: "diagnostics_update_failed",
        detail: diagErr.message || String(diagErr),
      },
      { status: 500 }
    );
  }

  // Add version header for deployment tracking
  const response = NextResponse.json({ ingestionId, jobId, status: "accepted" }, { status: 202 });
  response.headers.set("x-app-version", APP_VERSION);
  return response;
}
