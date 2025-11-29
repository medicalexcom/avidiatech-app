// src/app/api/v1/ingest/robot/route.ts
// Server-only "robot" ingest endpoint for automation/CI.
// - Requires header: x-avidiatech-robot-token === process.env.ROBOT_TOKEN
// - Creates the same product_ingestions row as the interactive endpoint
// - Calls ingestion engine using the engine's expected shape (GET /ingest?url=...)
// - Returns { jobId, status } on success
//
// SECURITY: keep ROBOT_TOKEN secret in Vercel envs, rotate regularly, and restrict usage.
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
const ROBOT_TOKEN = process.env.ROBOT_TOKEN || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

export async function POST(request: Request) {
  // Validate robot token header
  const token = request.headers.get("x-avidiatech-robot-token") || "";
  if (!ROBOT_TOKEN || token !== ROBOT_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let bodyJson: any = {};
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const url = (bodyJson?.url || "").toString();
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const clientOptions = bodyJson?.options || {};
  const fullExtract = !!bodyJson?.fullExtract;
  const export_type = bodyJson?.export_type || "JSON";
  const correlation_id = bodyJson?.correlationId || `robot_${Date.now()}`;

  // Build effective options:
  const effectiveOptions = fullExtract
    ? { includeSeo: true, includeSpecs: true, includeDocs: true, includeVariants: true }
    : {
        includeSeo: !!clientOptions.includeSeo,
        includeSpecs: !!clientOptions.includeSpecs,
        includeDocs: !!clientOptions.includeDocs,
        includeVariants: !!clientOptions.includeVariants,
      };

  // Create DB record
  let supabase;
  try {
    supabase = getServiceSupabaseClient();
  } catch (err: any) {
    console.error("Supabase config missing", err?.message || err);
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // If you need tenant/user mapping for automated runs, include tenant_id/user_id in the POST body
  // and validate them server-side. For now we allow optional tenant_id in body.
  const tenant_id = bodyJson?.tenant_id || null;
  const user_id = bodyJson?.user_id || null; // optional: track which service account triggered it

  const insert = {
    tenant_id,
    user_id,
    source_url: url,
    status: "pending",
    options: effectiveOptions,
    flags: {
      full_extract: fullExtract,
      includeSeo: !!effectiveOptions.includeSeo,
      includeSpecs: !!effectiveOptions.includeSpecs,
      includeDocs: !!effectiveOptions.includeDocs,
      includeVariants: !!effectiveOptions.includeVariants,
    },
    export_type,
    correlation_id,
    created_at: new Date().toISOString(),
  };

  const { data: created, error: insertError } = await supabase.from("product_ingestions").insert(insert).select("*").single();
  if (insertError) {
    console.error("robot: failed to create ingestion record", insertError);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }
  const jobId = created.id;

  // Build payload for signing (if engine wants signature)
  const payloadForSignature = {
    correlation_id,
    job_id: jobId,
    tenant_id,
    url,
    options: effectiveOptions,
    export_type,
    callback_url: `${APP_URL}/api/v1/ingest/callback`,
    action: "ingest",
  };
  const signature = signPayload(JSON.stringify(payloadForSignature), INGEST_SECRET);

  // Call engine in medx GET shape
  if (!INGEST_ENGINE_URL) {
    console.warn("robot: INGEST_ENGINE_URL not configured; skipping engine call");
  } else {
    try {
      const target = `${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(url)}`;
      const upstream = await fetch(target, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(signature ? { "x-avidiatech-signature": signature } : {}),
        },
      });

      const text = await upstream.text().catch(() => "");
      if (!upstream.ok) {
        const snippet = safeSnippet(text);
        console.warn("robot: ingest engine non-ok", upstream.status, snippet);
        await supabase.from("product_ingestions").update({
          engine_status: upstream.status,
          engine_error_snippet: snippet,
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);
      } else {
        // parse and persist
        try {
          const json = JSON.parse(text || "{}");
          await supabase.from("product_ingestions").update({
            status: "completed",
            normalized_payload: json,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);

          return NextResponse.json({ jobId, status: "completed", preview: json }, { status: 200 });
        } catch (err) {
          console.warn("robot: engine returned non-json success body", err);
          await supabase.from("product_ingestions").update({
            engine_status: 200,
            engine_error_snippet: safeSnippet(text),
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
        }
      }
    } catch (err: any) {
      console.error("robot: failed to call ingestion engine", err);
      await supabase.from("product_ingestions").update({
        engine_error_snippet: safeSnippet(String(err?.message || err)),
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }
  }

  return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
}
