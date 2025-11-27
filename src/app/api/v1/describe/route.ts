import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import type { DescribeRequest } from "@/components/describe/types";
import { saveIngestion, incrementUsageCounter, checkQuota } from "@/lib/supabaseServer";

/**
 * Robust Describe route with enhanced logging for debugging.
 *
 * Behavior:
 * - Validate auth + payload
 * - Try Render engine if configured; on error fallback to OpenAI if configured
 * - Persist ingestion (saveIngestion) and increment usage counters
 *
 * Note: This file logs errors and returns debug details when NODE_ENV !== 'production'.
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
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function callRenderEngine(forwardBody: any, engineUrl: string, engineSecret: string) {
  const url = `${engineUrl.replace(/\/$/, "")}/describe`;
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
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`Render engine returned ${res.status}: ${JSON.stringify(json)}`);
    (err as any).status = res.status;
    (err as any).engineResponse = json;
    (err as any).took = took;
    throw err;
  }
  return { json, took };
}

async function callOpenAI(forwardBody: any) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const functionSchema = {
    name: "describe_response",
    description: "Return structured product description and SEO fields as JSON.",
    parameters: {
      type: "object",
      properties: {
        descriptionHtml: { type: "string" },
        sections: {
          type: "object",
          properties: {
            overview: { type: "string" },
            features: { type: "array", items: { type: "string" } },
            specsSummary: { type: "object" },
            includedItems: { type: "array", items: { type: "string" } },
            manualsSectionHtml: { type: "string" },
          },
        },
        seo: {
          type: "object",
          properties: {
            h1: { type: "string" },
            pageTitle: { type: "string" },
            metaDescription: { type: "string" },
            seoShortDescription: { type: "string" },
          },
        },
        normalizedPayload: { type: "object" },
        raw: { type: "object" },
      },
      required: ["descriptionHtml", "sections", "seo"],
    },
  };

  const messages = [
    {
      role: "system",
      content:
        "You are AvidiaDescribe: generate structured, SEO-friendly product descriptions. Output only valid JSON according to the provided function schema. Enforce H1 <= 60 chars and meta description <= 160 chars. Sanitize HTML (no scripts).",
    },
    {
      role: "user",
      content: `Product data:\nName: ${forwardBody.name}\nShort: ${forwardBody.shortDescription}\nBrand: ${forwardBody.brand || "-"}\nSpecs: ${JSON.stringify(forwardBody.specs || {})}\nFormat: ${forwardBody.format || "avidia_standard"}`,
    },
  ];

  const start = Date.now();
  // Cast messages to any to satisfy OpenAI SDK TypeScript signatures across versions
  const completion = await client.chat.completions.create({
    model,
    messages: messages as any,
    functions: [functionSchema as any],
    function_call: { name: "describe_response" },
    max_tokens: 2000,
  });
  const took = Date.now() - start;

  const choice = completion.choices?.[0];
  const funcCall = choice?.message?.function_call;
  const argsJson = funcCall?.arguments;
  if (!argsJson) {
    throw new Error("Model did not return structured function response");
  }
  let structured: any;
  try {
    structured = JSON.parse(argsJson);
  } catch (err) {
    throw new Error("Failed to parse model output as JSON: " + String(err));
  }

  // Basic caps
  if (structured?.seo?.h1 && structured.seo.h1.length > 60) {
    structured.seo.h1 = structured.seo.h1.slice(0, 57).trim() + "...";
  }
  if (structured?.seo?.metaDescription && structured.seo.metaDescription.length > 160) {
    structured.seo.metaDescription = structured.seo.metaDescription.slice(0, 157).trim() + "...";
  }

  return { structured, took, model: model };
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startOverall = Date.now();

  // Log env presence (safe) on invocation
  console.log(`[describe:${requestId}] invoked; env presence:`, envPresenceReport());

  try {
    // Auth
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      console.warn(`[describe:${requestId}] unauthorized request`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId;
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;
    console.log(`[describe:${requestId}] auth ok user=${userId} tenant=${tenantId}`);

    // Parse + validate
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
      // Fail-open: allow generation but log the failure
    }

    const forwardBody = { tenant_id: tenantId, user_id: userId, ...payload };

    // Attempt Render engine first
    const engineUrl = process.env.RENDER_ENGINE_ENDPOINT;
    const engineSecret = process.env.RENDER_ENGINE_SECRET;
    let finalResponse: any = null;
    let usedEngine = "none";

    if (engineUrl && engineSecret) {
      try {
        console.log(`[describe:${requestId}] attempting render engine at ${engineUrl}`);
        const { json, took } = await callRenderEngine(forwardBody, engineUrl, engineSecret);
        finalResponse = json;
        usedEngine = "render";
        console.log(`[describe:${requestId}] render engine success (took=${took}ms)`);
      } catch (engErr) {
        console.error(`[describe:${requestId}] render engine error:`, (engErr as any)?.stack || engErr);
        usedEngine = "render_failed";
      }
    } else {
      console.log(`[describe:${requestId}] render engine not configured; skipping.`);
    }

    // If render failed or not configured, fallback to OpenAI
    if (!finalResponse) {
      try {
        console.log(`[describe:${requestId}] falling back to OpenAI`);
        const { structured, took, model } = await callOpenAI(forwardBody);
        finalResponse = structured;
        usedEngine = `openai:${model}`;
        console.log(`[describe:${requestId}] openai success (took=${took}ms)`);
      } catch (openErr) {
        console.error(`[describe:${requestId}] openai error:`, (openErr as any)?.stack || openErr);
        // Save failed ingestion for debugging and return 500
        try {
          await saveIngestion({ tenantId, userId, type: "describe", status: "failed", rawPayload: { request: forwardBody, error: String(openErr) } });
        } catch (saveErr) {
          console.error(`[describe:${requestId}] saveIngestion (failed) error:`, (saveErr as any)?.stack || saveErr);
        }
        const message = (openErr as any)?.message || "AI generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // Persist successful result (best-effort)
    try {
      await saveIngestion({ tenantId, userId, type: "describe", status: "success", normalizedPayload: finalResponse?.normalizedPayload ?? null, rawPayload: finalResponse ?? null });
      // increment usage counter (best-effort)
      try {
        await incrementUsageCounter({ tenantId, metric: "describe_calls", incrementBy: 1 });
      } catch (incErr) {
        console.error(`[describe:${requestId}] incrementUsageCounter error:`, (incErr as any)?.stack || incErr);
      }
    } catch (persistErr) {
      console.error(`[describe:${requestId}] saveIngestion error:`, (persistErr as any)?.stack || persistErr);
      // continue: we already have a successful finalResponse to return to client
    }

    const totalTook = Date.now() - startOverall;
    console.log(`[describe:${requestId}] completed using ${usedEngine} totalTook=${totalTook}ms`);

    return NextResponse.json(finalResponse);
  } catch (err: any) {
    // Log full stack to Vercel logs
    console.error(`[describe:${requestId}] unexpected error:`, err?.stack || err);

    const body = {
      error: err?.message || "Unknown error",
      // Only expose stack/details when not in production
      ...(isDev() ? { stack: err?.stack } : {}),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
