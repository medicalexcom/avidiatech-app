import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { saveIngestion, incrementUsageCounter, checkQuota } from "@/lib/supabaseServer";
import type { DescribeRequest } from "@/components/describe/types";

/**
 * AvidiaDescribe API route (updated)
 *
 * Changes made:
 * - Tolerant parsing of render engine text responses (extracts JSON if wrapped in text/markdown).
 * - Normalizes snake_case keys to camelCase for the frontend.
 * - Ensures key fallbacks (sections.overview, descriptionHtml, seo fields).
 * - Adds lightweight debug info in _debug.proxy so clients/ logs can trace forward.
 * - Keeps the same error mapping semantics and ingestion persistence behavior.
 *
 * Notes:
 * - This route DOES NOT call GPT directly; it forwards to Render (RENDER_ENGINE_ENDPOINT)
 *   using RENDER_ENGINE_SECRET (x-engine-key).
 * - If Render returns a non-OK status, we map and return a 502-ish error as before.
 */

/* ------------------------- Helpers ------------------------- */

type AnyObj = Record<string, any>;

function toCamel(s: string) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function normalizeObjectKeys(obj: AnyObj): AnyObj {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((i) => (typeof i === "object" ? normalizeObjectKeys(i) : i));
  const out: AnyObj = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const nk = toCamel(k);
    if (v && typeof v === "object") {
      out[nk] = normalizeObjectKeys(v);
    } else {
      out[nk] = v;
    }
  }
  return out;
}

/**
 * Attempts to extract a JSON object from raw text.
 * - Strips common triple-backtick fences and language hints.
 * - Returns parsed object or null.
 */
function extractJsonFromText(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;
  // Strip fences
  let t = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  // Remove any remaining fences inside
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  // Find first {...} block
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = t.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // fallthrough
    }
  }
  // Try parsing whole cleaned text
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}

/* ------------------------- Render call helper ------------------------- */

/**
 * callRenderEngine
 * - Posts forwardBody to engineUrl (ensures /describe)
 * - Returns { json, took, rawText }
 * - Throws on non-ok with attached engineResponse/text
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

  // Try parse; if fails, leave as text (we'll attempt extraction later)
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (e) {
    parsed = text;
  }

  if (!res.ok) {
    const err = new Error(`Render engine returned ${res.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
    (err as any).status = res.status;
    (err as any).engineResponse = parsed;
    (err as any).took = took;
    throw err;
  }

  return { json: parsed, rawText: text, took };
}

/* ------------------------- Route handler ------------------------- */

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[describe:${requestId}] invoked; env presence:`, {
    RENDER_ENGINE_ENDPOINT: !!process.env.RENDER_ENGINE_ENDPOINT,
    RENDER_ENGINE_SECRET: !!process.env.RENDER_ENGINE_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

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

    // Parse + validate body (basic shape)
    const body = await req.json().catch(() => null);
    if (!body) {
      console.warn(`[describe:${requestId}] empty body`);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
    }
    if (process.env.NODE_ENV !== "production") console.log(`[describe:${requestId}] request body:`, body);

    // Minimal validation (mirror previous zod rules)
    const name = (body as DescribeRequest).name;
    const shortDescription = (body as DescribeRequest).shortDescription;
    if (!name || !shortDescription) {
      console.warn(`[describe:${requestId}] validation failed: name/shortDescription required`);
      return NextResponse.json({ error: "Validation failed: name and shortDescription are required" }, { status: 422 });
    }

    // Quota check (fail-open)
    try {
      const quotaOk = await checkQuota({ tenantId, metric: "describe_calls", limit: Infinity });
      if (!quotaOk) {
        console.warn(`[describe:${requestId}] quota exceeded for tenant=${tenantId}`);
        return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
      }
    } catch (qerr) {
      console.error(`[describe:${requestId}] quota check error:`, (qerr as any)?.stack || qerr);
      // fail-open: continue
    }

    // Prepare forwarded body for Render
    const forwardBody = {
      tenant_id: tenantId,
      user_id: userId,
      name,
      shortDescription,
      brand: (body as DescribeRequest).brand ?? null,
      specs: (body as DescribeRequest).specs ?? null,
      format: (body as DescribeRequest).format ?? "avidia_standard",
    };

    // Ensure engine configured
    const engineUrl = process.env.RENDER_ENGINE_ENDPOINT;
    const engineSecret = process.env.RENDER_ENGINE_SECRET;
    if (!engineUrl || !engineSecret) {
      console.error(`[describe:${requestId}] Render engine not configured (RENDER_ENGINE_ENDPOINT or RENDER_ENGINE_SECRET missing)`);
      return NextResponse.json({ error: "Render engine not configured" }, { status: 500 });
    }

    // Call Render
    let finalResponseRaw: any = null;
    let renderRawText = "";
    try {
      console.log(`[describe:${requestId}] forwarding to render engine at ${engineUrl}`);
      const { json, rawText, took } = await callRenderEngine(forwardBody, engineUrl, engineSecret);
      finalResponseRaw = json;
      renderRawText = rawText;
      console.log(`[describe:${requestId}] render engine succeeded (took=${took}ms)`);
    } catch (engErr: any) {
      // Persist failed ingestion (best-effort)
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

      const status = engErr?.status ?? 500;
      if (status === 401) return NextResponse.json({ error: "Render engine unauthorized" }, { status: 401 });
      if (status === 403) return NextResponse.json({ error: "Render engine forbidden" }, { status: 403 });
      if (status >= 500) return NextResponse.json({ error: "Render engine error", details: engErr?.engineResponse ?? String(engErr) }, { status: 502 });
      return NextResponse.json({ error: "Render engine unavailable", details: engErr?.engineResponse ?? String(engErr) }, { status: 502 });
    }

    // If finalResponseRaw is a string (non-JSON), attempt to extract JSON from it
    let parsedFinal: any = null;
    if (typeof finalResponseRaw === "string") {
      parsedFinal = extractJsonFromText(finalResponseRaw) ?? null;
    } else if (finalResponseRaw && typeof finalResponseRaw === "object") {
      parsedFinal = finalResponseRaw;
    }

    // As a last resort, if parsedFinal is still null, attempt extraction from raw text payload
    if (!parsedFinal && renderRawText) {
      parsedFinal = extractJsonFromText(renderRawText) ?? null;
    }

    if (!parsedFinal || typeof parsedFinal !== "object") {
      console.error(`[describe:${requestId}] invalid response from render engine`, { parsedFinal, renderRawPreview: String(renderRawText || "").slice(0, 1000) });
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: { request: forwardBody, error: "Invalid render response", engineResponse: parsedFinal ?? renderRawText },
        });
      } catch (saveErr) {
        console.error(`[describe:${requestId}] saveIngestion (invalid response) error:`, (saveErr as any)?.stack || saveErr);
      }
      return NextResponse.json({ error: "Invalid render engine response" }, { status: 500 });
    }

    // Normalize keys to camelCase
    const normalized = normalizeObjectKeys(parsedFinal);

    // Ensure required shaped fields and sensible fallbacks
    normalized.sections = normalized.sections || {};
    if (!normalized.sections.overview) {
      normalized.sections.overview =
        normalized.descriptionHtml ||
        normalized.description_html ||
        (normalized.seo && normalized.seo.seoShortDescription) ||
        shortDescription ||
        "";
    }

    // Attach debug proxy info
    normalized._debug = normalized._debug || {};
    normalized._debug.proxy = { forwardedTo: engineUrl, status: 200 };

    // Persist successful ingestion (best-effort) - store normalizedPayload if available
    try {
      await saveIngestion({
        tenantId,
        userId,
        type: "describe",
        status: "success",
        normalizedPayload: normalized.normalizedPayload ?? null,
        rawPayload: parsedFinal ?? null,
      });
    } catch (persistErr) {
      console.error(`[describe:${requestId}] saveIngestion error:`, (persistErr as any)?.stack || persistErr);
      // continue
    }

    // Increment usage counter (best-effort)
    try {
      await incrementUsageCounter({ tenantId, metric: "describe_calls", incrementBy: 1 });
    } catch (incErr) {
      console.error(`[describe:${requestId}] incrementUsageCounter error:`, (incErr as any)?.stack || incErr);
    }

    console.log(`[describe:${requestId}] completed (render-only pipeline)`);
    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error(`[describe:${requestId}] unexpected error:`, err?.stack || err);
    return NextResponse.json({ error: err?.message || "Unknown error", ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {}) }, { status: 500 });
  }
}
