import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import type { DescribeRequest } from "@/components/describe/types";
import { saveIngestion, incrementUsageCounter, checkQuota } from "@/lib/supabaseServer";

/**
 * AvidiaDescribe API route
 *
 * IMPORTANT: Render ALWAYS calls GPT. There is NO GPT usage directly in Next.js and NO fallback logic.
 * This route MUST forward validated requests to the Render engine at `${RENDER_ENGINE_ENDPOINT}/describe`,
 * passing x-engine-key: RENDER_ENGINE_SECRET. The Render engine is responsible for calling GPT and
 * returning normalized, auto-healed structured JSON. The API then persists the result and returns it.
 *
 * Error handling:
 *  - 401 Unauthorized (Clerk)
 *  - 402 Quota exceeded
 *  - 422 Validation error
 *  - 502/500 Render/GPT failure (when Render responds with non-2xx)
 *
 * Do not perform any direct GPT calls here.
 */

const BodySchema = z.object({
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  brand: z.string().optional(),
  specs: z.record(z.string()).optional(),
  format: z.string().optional(),
});

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function envPresenceReport() {
  return {
    RENDER_ENGINE_ENDPOINT: !!process.env.RENDER_ENGINE_ENDPOINT,
    RENDER_ENGINE_SECRET: !!process.env.RENDER_ENGINE_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * callRenderEngine
 * - Accepts an engineUrl that may be a base (appends /describe) or already include /describe
 * - Posts the forwardBody as JSON with header x-engine-key
 * - Returns parsed JSON on success, or throws an Error with .status and .engineResponse
 */
async function callRenderEngine(forwardBody: any, engineUrl: string, engineSecret: string) {
  const trimmed = engineUrl.replace(/\/+$/, "");
  const url = trimmed.toLowerCase().endsWith("/describe") ? trimmed : `${trimmed}/describe`;

  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-engine-key": engineSecret,
    },
    body: JSON.stringify(forwardBody),
  });
  const took = Date.now() - start;

  const text = await res.text().catch(() => "");
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (e) {
    parsed = text; // non-JSON body
  }

  if (!res.ok) {
    const err = new Error(`Render engine returned ${res.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
    (err as any).status = res.status;
    (err as any).engineResponse = parsed;
    (err as any).took = took;
    throw err;
  }

  return { json: parsed, took };
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[describe:${requestId}] invoked; env presence:`, envPresenceReport());

  try {
    // Auth via Clerk
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      console.warn(`[describe:${requestId}] unauthorized request`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId;
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;
    console.log(`[describe:${requestId}] auth ok user=${userId} tenant=${tenantId}`);

    // Parse + validate body
    const body = await req.json().catch(() => null);
    if (!body) {
      console.warn(`[describe:${requestId}] empty body`);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
    }
    if (isDev()) console.log(`[describe:${requestId}] request body:`, body);

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      console.warn(`[describe:${requestId}] validation failed:`, parsed.error.format());
      return NextResponse.json({ error: parsed.error.message }, { status: 422 });
    }
    const payload = parsed.data as DescribeRequest;

    // Quota check
    try {
      const quotaOk = await checkQuota({ tenantId, metric: "describe_calls", limit: Infinity });
      if (!quotaOk) {
        console.warn(`[describe:${requestId}] quota exceeded for tenant=${tenantId}`);
        return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
      }
    } catch (qerr) {
      console.error(`[describe:${requestId}] quota check error:`, (qerr as any)?.stack || qerr);
      // Fail-open or return 500? We opt to fail-open (log) so generation can continue unless you prefer strict behavior.
    }

    // Prepare forwarded body for Render
    const forwardBody = {
      tenant_id: tenantId,
      user_id: userId,
      name: payload.name,
      shortDescription: payload.shortDescription,
      brand: payload.brand ?? null,
      specs: payload.specs ?? null,
      format: payload.format ?? "avidia_standard",
    };

    // Render engine must be configured and used ALWAYS (per corrected architecture)
    const engineUrl = process.env.RENDER_ENGINE_ENDPOINT;
    const engineSecret = process.env.RENDER_ENGINE_SECRET;
    if (!engineUrl || !engineSecret) {
      console.error(`[describe:${requestId}] Render engine not configured (RENDER_ENGINE_ENDPOINT or RENDER_ENGINE_SECRET missing)`);
      return NextResponse.json({ error: "Render engine not configured" }, { status: 500 });
    }

    // Send to Render (which itself will call GPT and return normalized output)
    let finalResponse: any = null;
    try {
      console.log(`[describe:${requestId}] forwarding to render engine at ${engineUrl}`);
      const { json, took } = await callRenderEngine(forwardBody, engineUrl, engineSecret);
      finalResponse = json;
      console.log(`[describe:${requestId}] render engine succeeded (took=${took}ms)`);
    } catch (engErr: any) {
      // Persist failed ingestion for debugging (best-effort)
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: { request: forwardBody, error: String(engErr), engineResponse: engErr?.engineResponse ?? null },
        });
      } catch (saveErr) {
        console.error(`[describe:${requestId}] saveIngestion (failed) error:`, (saveErr as any)?.stack || saveErr);
      }

      // Map render errors to appropriate response codes
      const status = engErr?.status ?? 500;
      // If engine returned 401/403 -> forward the auth error
      if (status === 401) return NextResponse.json({ error: "Render engine unauthorized" }, { status: 401 });
      if (status === 403) return NextResponse.json({ error: "Render engine forbidden" }, { status: 403 });

      // For 4xx/5xx from the engine return 502/500 respectively
      if (status >= 500) return NextResponse.json({ error: "Render engine error", details: engErr?.engineResponse ?? String(engErr) }, { status: 502 });
      // For other non-OK statuses return 502
      return NextResponse.json({ error: "Render engine unavailable", details: engErr?.engineResponse ?? String(engErr) }, { status: 502 });
    }

    // Validate that finalResponse matches expected schema minimally
    if (!finalResponse || typeof finalResponse !== "object") {
      console.error(`[describe:${requestId}] invalid response from render engine`, finalResponse);
      // Persist as failed and return 500
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: { request: forwardBody, error: "Invalid render response", engineResponse: finalResponse },
        });
      } catch (saveErr) {
        console.error(`[describe:${requestId}] saveIngestion (invalid response) error:`, (saveErr as any)?.stack || saveErr);
      }
      return NextResponse.json({ error: "Invalid render engine response" }, { status: 500 });
    }

    // Persist successful result (best-effort)
    try {
      await saveIngestion({
        tenantId,
        userId,
        type: "describe",
        status: "success",
        normalizedPayload: finalResponse?.normalizedPayload ?? null,
        rawPayload: finalResponse ?? null,
      });
    } catch (persistErr) {
      console.error(`[describe:${requestId}] saveIngestion error:`, (persistErr as any)?.stack || persistErr);
      // continue: we still return the result to client
    }

    // Increment usage counter (best-effort)
    try {
      await incrementUsageCounter({ tenantId, metric: "describe_calls", incrementBy: 1 });
    } catch (incErr) {
      console.error(`[describe:${requestId}] incrementUsageCounter error:`, (incErr as any)?.stack || incErr);
    }

    console.log(`[describe:${requestId}] completed (render-only pipeline)`);
    return NextResponse.json(finalResponse);
  } catch (err: any) {
    console.error(`[describe:${requestId}] unexpected error:`, err?.stack || err);
    return NextResponse.json({ error: err?.message || "Unknown error", ...(isDev() ? { stack: err?.stack } : {}) }, { status: 500 });
  }
}
