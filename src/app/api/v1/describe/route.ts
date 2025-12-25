import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { saveIngestion, incrementUsageCounter, checkQuota } from "@/lib/supabaseServer";
import type { DescribeRequest } from "@/components/describe/types";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import OpenAI from "openai";

type AnyObj = Record<string, any>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL =
  process.env.OPENAI_DESCRIBE_MODEL ||
  process.env.OPENAI_SEO_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function safeSnippet(v: string, n = 12000) {
  const s = String(v || "");
  return s.length > n ? s.slice(0, n) + "…(truncated)" : s;
}

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

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function requireField(condition: boolean, message: string) {
  if (!condition) {
    const err: any = new Error(message);
    err.code = "describe_invalid_model_output";
    throw err;
  }
}

async function callDescribeModel(opts: { system: string; user: string }) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const body: any = {
    model: MODEL,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.1,
    max_output_tokens: 12000,

    text: {
      format: {
        type: "json_schema",
        name: "AvidiaDescribeFull",
        strict: true,
        schema: {
          // IMPORTANT: OpenAI strict schema requires closed objects
          type: "object",
          additionalProperties: false,
          required: ["descriptionHtml", "sections", "seo", "features"],
          properties: {
            descriptionHtml: { type: "string" },

            sections: {
              type: "object",
              additionalProperties: false,
              required: [
                "overview",
                "hook",
                "mainDescription",
                "featuresBenefits",
                "specifications",
                "internalLinks",
                "whyChoose",
                "manuals",
                "faqs",
              ],
              properties: {
                overview: { type: "string" },
                hook: { type: "string" },
                mainDescription: { type: "string" },
                featuresBenefits: { type: "string" },
                specifications: { type: "string" },
                internalLinks: { type: "string" },
                whyChoose: { type: "string" },
                manuals: { type: "string" },
                faqs: { type: "string" },
              },
            },

            seo: {
              type: "object",
              additionalProperties: false,
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

            // Optional, but explicitly allowed
            data_gaps: {
              type: "array",
              items: { type: "string" },
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

  return { json, rawText };
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const debugOut =
    process.env.DEBUG_DESCRIBE_MODEL_OUTPUT === "true" ||
    process.env.NODE_ENV !== "production";

  try {
    const auth = safeGetAuth(req as any) as any;
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = auth.userId as string;
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;

    const body = (await req.json().catch(() => null)) as DescribeRequest | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });

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
      const quotaOk = await checkQuota({ tenantId, metric: "describe_calls", limit: Infinity });
      if (!quotaOk) return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
    } catch {
      // ignore
    }

    const { text: instructions, source: instructionsSource } =
      await loadCustomGptInstructionsWithInfo(tenantId);

    requireField(isNonEmptyString(instructions), "custom_gpt_instructions_missing_or_empty");

    const packet = {
      name_raw: name,
      description_raw: shortDescription,
      browsed_text: shortDescription,
      dom: {
        name_raw: name,
        description_raw: shortDescription,
        specs: body.specs ?? {},
        brand: body.brand ?? null,
      },
      pdf_text: "",
      pdf_docs: [],
      pdf_manual_urls: [],
      manuals: [],
      specs_structured: body.specs ?? {},
      brand: body.brand ?? null,
    };

    const system = [
      "You are AvidiaDescribe.",
      "ABSOLUTE PRIORITY: Follow the CUSTOM GPT INSTRUCTIONS below exactly. They override all other guidance.",
      "",
      "HARD REQUIREMENTS:",
      "1) Output MUST include ALL required sections/fields per the JSON schema (even if some are 'Not available').",
      "2) Do NOT invent facts. Use ONLY the packet fields as grounding.",
      "3) If info is missing, still output the section and add a note in data_gaps.",
      "4) The formatting/structure of the HTML content MUST follow the CUSTOM GPT INSTRUCTIONS.",
      "",
      "CUSTOM GPT INSTRUCTIONS (AUTHORITATIVE):",
      instructions.trim(),
    ].join("\n");

    const user = [
      "GROUND TRUTH PACKET (JSON):",
      JSON.stringify(packet, null, 2),
      "",
      "Generate the full SEO description output now, following the instructions.",
    ].join("\n");

    let parsed: AnyObj;
    let rawText = "";

    try {
      const result = await callDescribeModel({ system, user });
      parsed = result.json;
      rawText = result.rawText;
    } catch (err: any) {
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
            request: { name, shortDescription, brand: body.brand ?? null, specs: body.specs ?? null, format: body.format ?? null },
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

    // Validate required fields exist (no fallback to input)
    requireField(isNonEmptyString(parsed?.descriptionHtml), "missing_descriptionHtml");
    requireField(isNonEmptyString(parsed?.sections?.overview), "missing_sections.overview");
    requireField(isNonEmptyString(parsed?.seo?.h1), "missing_seo.h1");
    requireField(isNonEmptyString(parsed?.seo?.title), "missing_seo.title");
    requireField(isNonEmptyString(parsed?.seo?.metaDescription), "missing_seo.metaDescription");
    requireField(Array.isArray(parsed?.features), "missing_features_array");

    // Persist success
    try {
      await saveIngestion({
        tenantId,
        userId,
        type: "describe",
        status: "success",
        normalizedPayload: parsed.normalizedPayload ?? null,
        rawPayload: parsed ?? null,
      });
    } catch {
      // ignore
    }

    try {
      await incrementUsageCounter({ tenantId, metric: "describe_calls", incrementBy: 1 });
    } catch {
      // ignore
    }

    return NextResponse.json({
      ...parsed,
      _debug: {
        requestId,
        model: MODEL,
        instruction_source: instructionsSource || null,
        mode: "json_schema_closed_objects_full_sections",
      },
    });
  } catch (err: any) {
    if (err?.code === "describe_invalid_model_output") {
      return NextResponse.json(
        { error: "describe_model_invalid_output", detail: err?.message || "invalid_output" },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
