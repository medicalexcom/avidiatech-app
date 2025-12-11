import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { userId } =
      ((safeGetAuth(req as any) as { userId?: string | null }) as {
        userId?: string | null;
      }) || {};

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Hard fail if the ingest engine is not configured.
    if (!INGEST_ENGINE_URL || !INGEST_SECRET) {
      console.error(
        "INGEST_ENGINE_URL or INGEST_SECRET not configured. Cannot start ingestion."
      );
      return NextResponse.json(
        {
          error: "ingest_engine_not_configured",
          detail:
            "INGEST_ENGINE_URL and INGEST_SECRET must be set in the server environment.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const url = (body?.url || "").toString();
    const clientOptions = body?.options || {};
    const fullExtract = !!body?.fullExtract;
    const export_type = body?.export_type || "JSON";
    const correlation_id =
      body?.correlationId || `corr_${Date.now().toString()}`;

    if (!url) {
      return NextResponse.json({ error: "missing url" }, { status: 400 });
    }

    let supabase: any;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json(
        { error: "server_misconfigured_supabase" },
        { status: 500 }
      );
    }

    // Resolve profile / tenant
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (profileError) {
      console.warn("profile lookup failed", profileError);
      return NextResponse.json(
        { error: "profile_lookup_failed" },
        { status: 500 }
      );
    }

    const tenant_id = profileData?.tenant_id || null;
    const role = profileData?.role || "user";

    // Quota check (if applicable)
    if (role !== "owner") {
      const { data: counters } = await supabase
        .from("usage_counters")
        .select("*")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .single();

      if (counters && typeof counters.ingest_calls === "number") {
        const monthlyLimit = process.env.DEFAULT_MONTHLY_INGEST_LIMIT
          ? parseInt(process.env.DEFAULT_MONTHLY_INGEST_LIMIT, 10)
          : 1000;

        if (counters.ingest_calls >= monthlyLimit) {
          return NextResponse.json(
            { error: "quota_exceeded" },
            { status: 402 }
          );
        }
      }
    }

    const effectiveOptions = fullExtract
      ? {
          includeSeo: true,
          includeSpecs: true,
          includeDocs: true,
          includeVariants: true,
        }
      : {
          includeSeo: !!clientOptions.includeSeo,
          includeSpecs: !!clientOptions.includeSpecs,
          includeDocs: !!clientOptions.includeDocs,
          includeVariants: !!clientOptions.includeVariants,
        };

    const flags = {
      full_extract: fullExtract,
      includeSeo: !!effectiveOptions.includeSeo,
      includeSpecs: !!effectiveOptions.includeSpecs,
      includeDocs: !!effectiveOptions.includeDocs,
      includeVariants: !!effectiveOptions.includeVariants,
    };

    // Initial diagnostics object so new rows are never null
    const initialDiagnostics = {
      created_by: "ingest-route",
      created_at: new Date().toISOString(),
      engine_call: null,
    };

    const insert = {
      tenant_id,
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

    const { data: created, error: insertError } = await supabase
      .from("product_ingestions")
      .insert(insert)
      .select("*")
      .single();

    if (insertError || !created) {
      console.error("failed to create ingestion record", insertError);
      return NextResponse.json(
        { error: "db_insert_failed" },
        { status: 500 }
      );
    }

    const ingestionId = created.id;
    const jobId = ingestionId;
    const callbackUrl = `${APP_URL}/api/v1/ingest/callback`;

    // Best-effort save of job_id if column exists
    try {
      const { error: jobErr } = await supabase
        .from("product_ingestions")
        .update({
          job_id: jobId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestionId);

      if (jobErr) {
        console.warn(
          "job_id update failed (column may not exist or RLS issue)",
          jobErr.message || jobErr
        );
      }
    } catch (e) {
      console.warn("job_id update threw", e);
    }

    const payload = {
      correlation_id,
      job_id: jobId,
      tenant_id,
      url,
      options: effectiveOptions,
      export_type,
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
        console.warn(
          "ingest engine responded non-OK",
          res.status,
          text || "<empty>"
        );
      } else {
        // mark as processing if engine accepted the job
        const { error: statusErr } = await supabase
          .from("product_ingestions")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ingestionId);

        if (statusErr) {
          console.warn(
            "failed to update status to processing",
            statusErr.message || statusErr
          );
        }
      }
    } catch (err) {
      console.error("failed to call ingest engine", err);
      engineDiagnostics = {
        ...engineDiagnostics,
        error: String(err),
      };
    }

    // Persist engine_call diagnostics — if THIS fails, we now return 500
    const { error: diagErr } = await supabase
      .from("product_ingestions")
      .update({
        diagnostics: {
          ...(created.diagnostics || {}),
          engine_call: engineDiagnostics,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", ingestionId);

    if (diagErr) {
      console.error(
        "failed to persist engine_call diagnostics",
        diagErr.message || diagErr
      );
      return NextResponse.json(
        {
          error: "diagnostics_update_failed",
          detail: diagErr.message || String(diagErr),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ingestionId, jobId, status: "accepted" },
      { status: 202 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/ingest error:", err);
    return NextResponse.json(
      { error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}
