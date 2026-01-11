import OpenAI from "openai";

/**
 * translateProduct
 * - product: object containing source fields (name_raw, description_raw / description_html, features, specs, metadata etc.)
 * - languages: string[] target language codes
 * - fields: string[] list of fields to translate (e.g. ['name','description_html','features','specs'])
 *
 * Returns: { [lang]: { name?, description_html?, features?, specs?, metadata? } }
 *
 * Note: This file intentionally uses local narrowing/casting when reading the OpenAI
 * response to avoid strict SDK output-type mismatches across SDK versions.
 */

type Product = Record<string, any>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function buildPromptForField(fieldName: string, value: any, language: string) {
  return `Translate the following ${fieldName} content into ${language}.
Keep all HTML tags, table structures, numbers, units, SKUs, model numbers and brand names exactly as-is (do not translate them).
Preserve whitespace and relative HTML structure. Return JSON with a single key "${fieldName}" whose value is the translated content.
Input:
${typeof value === "string" ? value : JSON.stringify(value)}
Return ONLY valid JSON.`;
}

async function callOpenAIForField(prompt: string) {
  // Make the request
  const res = await client.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.0
  });

  // Robustly extract text from the Response object (SDK output shapes vary)
  // We cast to any for parsing safety, then try multiple strategies.
  const rawOutput: any = (res as any).output?.at(0);
  let text = "";

  if (!rawOutput) {
    throw new Error("No output from OpenAI");
  }

  // Strategy 1: output may have a 'content' array with text parts
  try {
    if (rawOutput && (rawOutput as any).content) {
      const content = (rawOutput as any).content;
      if (typeof content === "string") {
        text += content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string") {
            text += part;
          } else if (part && typeof part.text === "string") {
            text += part.text;
          } else if (part && typeof part.content === "string") {
            text += part.content;
          }
        }
      }
    } else if (typeof rawOutput === "string") {
      text += rawOutput;
    } else if ((rawOutput as any).text) {
      text += (rawOutput as any).text;
    } else {
      // Fallback: stringify the whole rawOutput
      text += JSON.stringify(rawOutput);
    }
  } catch (e) {
    // Fallback to stringify if anything unexpected happens
    text = JSON.stringify(rawOutput);
  }

  // Extract first JSON object or array found in text
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    const e: any = new Error("OpenAI response not parseable JSON");
    e.raw = text;
    throw e;
  }
}

export async function translateProduct(
  product: Product,
  languages: string[],
  fields: string[],
  opts?: { model?: string; temperature?: number }
): Promise<Record<string, any>> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const results: Record<string, any> = {};

  for (const lang of languages) {
    const langResult: Record<string, any> = {};
    for (const field of fields) {
      const value = product[field] ?? product[`${field}_raw`] ?? null;
      if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        continue;
      }

      const prompt = buildPromptForField(field, value, lang);
      try {
        const parsed = await callOpenAIForField(prompt);
        if (parsed && typeof parsed === "object" && parsed[field] !== undefined) {
          langResult[field] = parsed[field];
        } else {
          // If the model returned the raw translated string or other shape
          langResult[field] = parsed;
        }
      } catch (err: any) {
        langResult[field] = {
          _error: String(err?.message || err),
          _raw: err?.raw ? String(err.raw).slice(0, 2000) : undefined
        };
      }
    }
    results[lang] = langResult;
  }

  return results;
}
