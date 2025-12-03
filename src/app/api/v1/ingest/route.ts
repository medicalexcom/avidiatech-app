// Next.js App Router: POST /api/v1/ingest
// Creates product_ingestions row, sets job_id, calls ingestion engine,
// and persists engine_call diagnostics.

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
        { error: "server misconfigured: missing Supabase envs" },
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
        { error: "profile lookup failed" },
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

    // Best-effort save of job_id if column exists
    try {
      await supabase
        .from("product_ingestions")
        .update({
          job_id: jobId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestionId);
    } catch (e) {
      console.warn("job_id update failed (column may not exist yet)", e);
    }

    const callbackUrl = `${APP_URL}/api/v1/ingest/callback`;

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

    const signature = signPayload(JSON.stringify(payload), INGEST_SECRET);

    const engineCallRecordBase = {
      attempted_at: new Date().toISOString(),
      engine_url: INGEST_ENGINE_URL || null,
      attempted_payload_summary: {
        job_id: jobId,
        url,
        options: effectiveOptions,
        callback_url: callbackUrl,
      },
    };

    if (!INGEST_ENGINE_URL) {
      console.warn(
        "INGEST_ENGINE_URL not configured; ingestion engine call skipped"
      );
      try {
        await supabase
          .from("product_ingestions")
          .update({
            diagnostics: {
              ...(created.diagnostics || {}),
              engine_call: {
                ...engineCallRecordBase,
                skipped: true,
                reason: "INGEST_ENGINE_URL not configured",
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", ingestionId);
      } catch (uErr) {
        console.warn(
          "failed to persist engine_call diagnostics (skipped)",
          uErr
        );
      }
    } else {
      try {
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

        try {
          await supabase
            .from("product_ingestions")
            .update({
              diagnostics: {
                ...(created.diagnostics || {}),
                engine_call: {
                  ...engineCallRecordBase,
                  statusCode: res.status,
                  responseBody: text,
                },
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", ingestionId);
        } catch (uErr) {
          console.warn("failed to persist engine_call diagnostics", uErr);
        }

        if (!res.ok) {
          console.warn(
            "ingest engine responded non-OK",
            res.status,
            text || "<empty>"
          );
        } else {
          // Optionally mark as "processing" once engine accepted the job
          await supabase
            .from("product_ingestions")
            .update({
              status: "processing",
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", ingestionId);
        }
      } catch (err) {
        console.error("failed to call ingest engine", err);
        try {
          await supabase
            .from("product_ingestions")
            .update({
              diagnostics: {
                ...(created.diagnostics || {}),
                engine_call: {
                  ...engineCallRecordBase,
                  error: String(err),
                },
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", ingestionId);
        } catch (uErr) {
          console.warn(
            "failed to persist engine_call error diagnostic",
            uErr
          );
        }
      }
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
