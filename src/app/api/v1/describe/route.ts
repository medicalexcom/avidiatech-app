import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import {
  saveIngestion,
  incrementUsageCounter,
  checkQuota,
} from "@/lib/supabaseServer";
import type { DescribeRequest } from "@/components/describe/types";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { callOpenaiChat } from "@/lib/openai";

/**
 * AvidiaDescribe API route (OpenAI direct)
 */

type AnyObj = Record<string, any>;

function safeSnippet(v: string, n = 8000) {
  const s = String(v || "");
  return s.length > n ? s.slice(0, n) + "…(truncated)" : s;
}

/**
 * Extract first balanced JSON object from text.
 * Handles:
 * - leading commentary
 * - ```json fences
 * - trailing text
 */
function extractFirstJsonObject(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;

  // remove common fences but keep content
  let t = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  // quick path: direct JSON
  try {
    if (t.startsWith("{") && t.endsWith("}")) return JSON.parse(t);
  } catch {
    // continue
  }

  // scan for first balanced {...}
  const start = t.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < t.length; i++) {
    const ch = t[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) {
        const candidate = t.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
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

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const debugOut = process.env.DEBUG_DESCRIBE_MODEL_OUTPUT === "true";

  try {
    const auth = safeGetAuth(req as any) as any;
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId as string;
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;

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

    const { text: instructions, source: instructionsSource } =
      await loadCustomGptInstructionsWithInfo(tenantId);

    const model =
      process.env.OPENAI_SEO_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1";

    const system = [
      "You are AvidiaDescribe. You generate SEO-optimized, compliant product descriptions from short inputs.",
      "",
      "CRITICAL OUTPUT RULE:",
      "- Return ONLY a single valid JSON object (no markdown, no code fences, no commentary).",
      "",
      "If you cannot comply, still return JSON with empty strings for missing fields.",
      "",
      "REQUIRED JSON SHAPE (exact keys):",
      "{",
      '  "descriptionHtml": "<p>...</p>",',
      '  "sections": { "overview": "<p>...</p>" },',
      '  "seo": { "h1": "...", "title": "...", "metaDescription": "..." },',
      '  "features": ["...", "..."]',
      "}",
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
      "",
      "Return JSON now.",
    ]
      .filter(Boolean)
      .join("\n");

    const openaiRes = await callOpenaiChat({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1400,
    });

    const rawText =
      openaiRes?.choices?.[0]?.message?.content ??
      openaiRes?.choices?.[0]?.text ??
      "";

    const parsed = extractFirstJsonObject(String(rawText || ""));

    if (!parsed || typeof parsed !== "object") {
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: {
            requestId,
            request: {
              name,
              shortDescription,
              brand: body.brand ?? null,
              specs: body.specs ?? null,
            },
            error: "invalid_openai_json",
            model,
            instruction_source: instructionsSource || null,
            raw: safeSnippet(String(rawText || "")),
          },
        });
      } catch {
        // ignore
      }

      return NextResponse.json(
        {
          error: "Describe model returned invalid JSON",
          ...(debugOut
            ? { debug: { requestId, model, raw_snippet: safeSnippet(String(rawText || ""), 2000) } }
            : {}),
        },
        { status: 502 }
      );
    }

    // enforce required fields (still no fallback to input)
    const descriptionHtml =
      parsed.descriptionHtml ?? parsed.description_html ?? null;
    requireField(isNonEmptyString(descriptionHtml), "missing_descriptionHtml");

    const overview = parsed?.sections?.overview ?? null;
    requireField(isNonEmptyString(overview), "missing_sections.overview");

    const seo = parsed.seo ?? null;
    requireField(!!seo && typeof seo === "object", "missing_seo_object");
    requireField(isNonEmptyString(seo.h1), "missing_seo.h1");
    requireField(isNonEmptyString(seo.title), "missing_seo.title");
    requireField(isNonEmptyString(seo.metaDescription), "missing_seo.metaDescription");

    const features = asStringArray(parsed.features);

    const normalized: AnyObj = {
      ...parsed,
      descriptionHtml: String(descriptionHtml),
      sections: { ...(parsed.sections || {}), overview: String(overview) },
      seo: {
        h1: String(seo.h1),
        title: String(seo.title),
        metaDescription: String(seo.metaDescription),
      },
      features,
      _debug: {
        ...(parsed._debug || {}),
        instruction_source: instructionsSource || null,
        requestId,
        model,
        mode: "openai_direct",
      },
    };

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
          ...(debugOut ? { debug: { requestId } } : {}),
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
