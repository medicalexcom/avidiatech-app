import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL =
  process.env.OPENAI_DESCRIBE_MODEL ||
  process.env.OPENAI_SEO_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function callDescribeModel(opts: {
  system: string;
  user: string;
}) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  // JSON Schema enforcement (preferred).
  // If your account/model doesn't support json_schema, we can downgrade to json_object.
  const res = await client.responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.2,
    max_output_tokens: 1600,
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
  });

  // Extract text from response (SDK output shapes vary)
  const rawOutput: any = (res as any).output?.at(0);
  let text = "";

  if (rawOutput?.content) {
    const content = rawOutput.content;
    if (typeof content === "string") text = content;
    else if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === "string") text += part;
        else if (part?.text) text += part.text;
        else if (part?.content) text += part.content;
      }
    }
  } else if (rawOutput?.text) {
    text = rawOutput.text;
  }

  // With json_schema, the content is typically already JSON text
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e: any) {
    const err: any = new Error("describe_invalid_json_from_responses_api");
    err.raw = text;
    throw err;
  }

  return { json, model: OPENAI_MODEL };
}
