import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { saveIngestion, incrementUsageCounter, checkQuota } from "@/lib/supabaseServer";
import type { DescribeRequest } from "@/components/describe/types";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import OpenAI from "openai";

/**
 * AvidiaDescribe API route (OpenAI direct via Responses API)
 *
 * Notes:
 * - We intentionally pass `response_format` using `as any` because the installed
 *   openai SDK typings (openai@^6.10.0 in this repo) do not include it in
 *   ResponseCreateParams*, even though the API supports it.
 *
 * Env:
 * - OPENAI_API_KEY (required)
 * - OPENAI_DESCRIBE_MODEL (optional)
 * - OPENAI_SEO_MODEL (optional)
 * - OPENAI_MODEL (optional)
 * - DEBUG_DESCRIBE_MODEL_OUTPUT="true" (optional)
 */

type AnyObj = Record<string, any>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL =
  process.env.OPENAI_DESCRIBE_MODEL ||
  process.env.OPENAI_SEO_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function safeSnippet(v: string, n = 2500) {
  const s = String(v || "");
  return s.length > n ? s.slice(0, n) + "…(truncated)" : s;
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: any): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x) => typeof x === "string" && x.trim().length > 0);
  return out.length ? out : [];
}

function requireField(condition: boolean, message: string) {
  if (!condition) {
    const err: any = new Error(message);
    err.code = "describe_invalid_model_output";
    throw err;
  }
}

/**
 * Extract a text body from an OpenAI Responses API response.
 * SDK output shapes can vary; this is defensive.
 */
function extractTextFromResponses(res: any): string {
  const out0 = res?.output?.at?.(0) ?? res?.output?.[0] ?? null;
  if (!out0) return "";

  const content = out0?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    let text = "";
    for (const part of content) {
      if (typeof part === "string") text += part;
      else if (part?.text && typeof part.text === "string") text += part.text;
      else if (part?.content && typeof part.content === "string") text += part.content;
    }
    return text;
  }

  if (typeof out0?.text === "string") return out0.text;

  try {
    return JSON.stringify(out0);
  } catch {
    return "";
  }
}

/**
 * Call the Describe model using Responses API.
 * We use JSON schema enforcement via `response_format`, but we pass it using `as any`
 * because the SDK typings in this repo don't yet include that property.
 */
async function callDescribeModel(opts: {
  system: string;
  user: string;
}): Promise<{ json: AnyObj; rawText: string; model: string }> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const body: any = {
    model: MODEL,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.2,
    max_output_tokens: 1600,

    // Typings workaround:
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "AvidiaDescribeOutput",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: true,
          required: ["descriptionHtml", "sections", "seo", "features"],
          properties: {
            descriptionHtml: { type: "string" },
            sections: {
              type: "object",
              additionalProperties: true,
              required: ["overview"],
              properties: {
                overview: { type: "string" },
              },
            },
            seo: {
              type: "object",
              additionalProperties: true,
              required: ["h1", "title", "metaDescription"],
              properties: {
                h1: { type: "string" },
                title: { type: "string" },
                metaDescription: { type: "string" },
              },
            },
            features: {
              type: "array",
              items: { type: "string" },
            },
            _debug: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
    },
  };

  const res = await client.responses.create(body as any);

  const rawText = extractTextFromResponses(res);
  let json: AnyObj;

  try {
    json = JSON.parse(rawText);
  } catch (e: any) {
    const err: any = new Error("describe_invalid_json_from_responses_api");
    err.raw = rawText;
    throw err;
  }

  return { json, rawText, model: MODEL };
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const debugOut =
    process.env.DEBUG_DESCRIBE_MODEL_OUTPUT === "true" ||
    process.env.NODE_ENV !== "production";

  try {
    // Auth (Clerk)
    const auth = safeGetAuth(req as any) as any;
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId as string;
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;

    // Parse body
    const body = (await req.json().catch(() => null)) as DescribeRequest | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
    }

    const name = body.name?.trim();
    const shortDescription = body.shortDescription?.trim();
    if (!name || !shortDescription) {
      return NextResponse.json(
        { error: "Validation failed: name and shortDescription are required" },
        { status: 422 }
      );
    }

    // Quota check (fail-open)
    try {
      const quotaOk = await checkQuota({
        tenantId,
        metric: "describe_calls",
        limit: Infinity,
      });
      if (!quotaOk) {
        return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
      }
    } catch {
      // ignore
    }

    // Load tenant instructions
    const { text: instructions, source: instructionsSource } =
      await loadCustomGptInstructionsWithInfo(tenantId);

    const system = [
      "You are AvidiaDescribe. You generate SEO-optimized, compliant product descriptions from short inputs.",
      "",
      "CRITICAL OUTPUT RULE:",
      "- Output MUST be valid JSON matching the provided JSON schema.",
      "- Do not output markdown, code fences, or commentary.",
      "",
      "CRITICAL BEHAVIOR RULES:",
      "- Do NOT echo or copy the input verbatim. Rewrite and improve it.",
      "- Do NOT invent facts/specs. Only use what is provided in the input fields.",
      "- Keep claims compliant and conservative. Avoid ungrounded medical claims.",
      "- HTML allowed: <p>, <ul>, <li>, <strong>, <h2>, <h3>. No inline styles.",
      "",
      isNonEmptyString(instructions)
        ? `CUSTOM GPT INSTRUCTIONS (MUST FOLLOW):\n${instructions.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const user = [
      "INPUT:",
      `name: ${name}`,
      body.brand ? `brand: ${String(body.brand).trim()}` : "",
      `shortDescription: ${shortDescription}`,
      body.specs ? `specs: ${JSON.stringify(body.specs)}` : "",
      body.format ? `format: ${String(body.format)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Call model
    let parsed: AnyObj;
    let rawText = "";
    try {
      const result = await callDescribeModel({ system, user });
      parsed = result.json;
      rawText = result.rawText;
    } catch (err: any) {
      // Persist failure
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: {
            requestId,
            model: MODEL,
            instruction_source: instructionsSource || null,
            request: {
              name,
              shortDescription,
              brand: body.brand ?? null,
              specs: body.specs ?? null,
              format: body.format ?? null,
            },
            error: String(err?.message || err),
            raw: safeSnippet(String(err?.raw || rawText || "")),
          },
        });
      } catch {
        // ignore
      }

      return NextResponse.json(
        {
          error: "Describe model returned invalid JSON",
          ...(debugOut
            ? {
                detail: String(err?.message || err),
                debug: {
                  requestId,
                  model: MODEL,
                  raw_snippet: safeSnippet(String(err?.raw || rawText || "")),
                  instruction_source: instructionsSource || null,
                },
              }
            : {}),
        },
        { status: 502 }
      );
    }

    // Validate required fields (NO fallback-to-input behavior)
    const descriptionHtml = parsed?.descriptionHtml ?? null;
    requireField(isNonEmptyString(descriptionHtml), "missing_descriptionHtml");

    const overview = parsed?.sections?.overview ?? null;
    requireField(isNonEmptyString(overview), "missing_sections.overview");

    const seo = parsed?.seo ?? null;
    requireField(!!seo && typeof seo === "object", "missing_seo_object");
    requireField(isNonEmptyString((seo as any).h1), "missing_seo.h1");
    requireField(isNonEmptyString((seo as any).title), "missing_seo.title");
    requireField(
      isNonEmptyString((seo as any).metaDescription),
      "missing_seo.metaDescription"
    );

    const features = asStringArray(parsed?.features);

    const normalized: AnyObj = {
      ...parsed,
      descriptionHtml: String(descriptionHtml),
      sections: { ...(parsed.sections || {}), overview: String(overview) },
      seo: {
        ...(parsed.seo || {}),
        h1: String((seo as any).h1),
        title: String((seo as any).title),
        metaDescription: String((seo as any).metaDescription),
      },
      features,
      _debug: {
        ...(parsed._debug || {}),
        mode: "openai_direct_responses_json_schema",
        requestId,
        model: MODEL,
        instruction_source: instructionsSource || null,
      },
    };

    // Persist success
    try {
      await saveIngestion({
        tenantId,
        userId,
        type: "describe",
        status: "success",
        normalizedPayload: normalized.normalizedPayload ?? null,
        rawPayload: parsed ?? null,
      });
    } catch {
      // ignore
    }

    // Increment usage counter
    try {
      await incrementUsageCounter({
        tenantId,
        metric: "describe_calls",
        incrementBy: 1,
      });
    } catch {
      // ignore
    }

    return NextResponse.json(normalized);
  } catch (err: any) {
    if (err?.code === "describe_invalid_model_output") {
      return NextResponse.json(
        {
          error: "describe_model_invalid_output",
          detail: err?.message || "invalid_output",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
