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
 *
 * Behavior:
 * - Calls OpenAI directly using OPENAI_API_KEY.
 * - Loads tenant custom GPT instructions and injects them into the system prompt.
 * - Enforces "Return ONLY valid JSON" and a fixed output schema.
 * - Removes ALL content fallbacks that would echo input (no more overview = shortDescription).
 *
 * Env:
 * - OPENAI_API_KEY (required)
 * - OPENAI_SEO_MODEL or OPENAI_MODEL (optional; default: gpt-4.1)
 */

type AnyObj = Record<string, any>;

function extractJsonFromText(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;

  // Strip triple-backtick fences if present
  let t = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");

  // Try to locate first JSON object
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = t.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  // Fallback: parse whole cleaned text
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
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
      // ignore: fail-open
    }

    // Load custom instructions (tenant override > local file > github raw)
    const { text: instructions, source: instructionsSource } =
      await loadCustomGptInstructionsWithInfo(tenantId);

    const model =
      process.env.OPENAI_SEO_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1";

    // System prompt: include your instructions + strict JSON schema
    const system = [
      "You are AvidiaDescribe. You generate SEO-optimized, compliant product descriptions from short inputs.",
      "",
      "CRITICAL OUTPUT RULE:",
      "- Return ONLY a single valid JSON object (no markdown, no code fences, no commentary).",
      "",
      "CRITICAL BEHAVIOR RULES:",
      "- Do NOT echo or copy the input verbatim. Rewrite and improve it.",
      "- Do NOT invent facts/specs. Only use what is provided in the input fields.",
      "- Keep claims compliant and conservative. Avoid ungrounded medical claims.",
      "- HTML allowed: <p>, <ul>, <li>, <strong>, <h2>, <h3>. No inline styles.",
      "",
      "REQUIRED JSON SHAPE (exact keys):",
      "{",
      '  "descriptionHtml": "<p>...</p>",',
      '  "sections": {',
      '    "overview": "<p>...</p>"',
      "  },",
      '  "seo": { "h1": "...", "title": "...", "metaDescription": "..." },',
      '  "features": ["...", "..."],',
      '  "_debug": { "instruction_source": "..." }',
      "}",
      "",
      isNonEmptyString(instructions)
        ? `CUSTOM GPT INSTRUCTIONS (MUST FOLLOW):\n${instructions.trim()}`
        : "CUSTOM GPT INSTRUCTIONS: (none provided)",
    ].join("\n");

    // User prompt: provide the structured input
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

    // Call OpenAI
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

    const parsed = extractJsonFromText(String(rawText || ""));
    if (!parsed || typeof parsed !== "object") {
      // Persist failure (best-effort)
      try {
        await saveIngestion({
          tenantId,
          userId,
          type: "describe",
          status: "failed",
          rawPayload: {
            requestId,
            request: { name, shortDescription, brand: body.brand ?? null, specs: body.specs ?? null },
            error: "invalid_openai_json",
            model,
            raw: String(rawText || "").slice(0, 8000),
          },
        });
      } catch {
        // ignore
      }

      return NextResponse.json(
        { error: "Describe model returned invalid JSON" },
        { status: 502 }
      );
    }

    // Enforce required fields: NO FALLBACKS that reuse input text
    const descriptionHtml =
      parsed.descriptionHtml ?? parsed.description_html ?? null;
    requireField(isNonEmptyString(descriptionHtml), "missing_descriptionHtml");

    const overview =
      parsed?.sections?.overview ??
      parsed?.sections?.Overview ??
      null;
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

    // Persist success (best-effort)
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

    // Increment usage counter (best-effort)
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
    // If we threw due to invalid model output, return a clear error
    if (err?.code === "describe_invalid_model_output") {
      return NextResponse.json(
        { error: "describe_model_invalid_output", detail: err?.message || "invalid_output" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
