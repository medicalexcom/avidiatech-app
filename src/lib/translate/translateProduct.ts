import OpenAI from "openai";

/**
 * translateProduct
 * - product: object containing source fields (name_raw, description_raw / description_html, features, specs, metadata etc.)
 * - languages: string[] target language codes (must be from SUPPORTED_LANGUAGES)
 * - fields: string[] list of fields to translate (e.g. ['name','description_html','features','specs'])
 * - options: optional settings (model, temperature)
 *
 * Returns: { [lang]: { name?, description_html?, features?, specs?, metadata? } }
 *
 * Important: this function uses server-side OpenAI calls. Do NOT call client-side.
 */

type Product = Record<string, any>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // change as needed

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function buildPromptForField(fieldName: string, value: any, language: string) {
  // Provide strong instructions to preserve HTML/tables/numbers/units/SKUs
  return `Translate the following ${fieldName} content into ${language}.
Keep all HTML tags, table structures, numbers, units, SKUs, model numbers and brand names exactly as-is (do not translate them).
Preserve whitespace and relative HTML structure. Return JSON with a single key "${fieldName}" whose value is the translated content.
Input:
${typeof value === "string" ? value : JSON.stringify(value)}
Return ONLY valid JSON.`;
}

async function callOpenAIForField(prompt: string, schemaHint = {}) {
  // Calls OpenAI responses.create and expects a JSON string result
  // Returns parsed JSON or throws.
  const res = await client.responses.create({
    model: OPENAI_MODEL,
    // Use a short system instruction and the prompt as user content
    input: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.0
  });

  // Responses API yields output[0].content[0].text or .parts depending on model
  const output = res.output?.at(0);
  // try to obtain a JSON text payload
  let text = "";
  if (!output) throw new Error("No output from OpenAI");
  // Support different shapes
  if (typeof output?.content === "string") text = output.content;
  else if (Array.isArray(output?.content)) {
    // find first text/structured chunk
    text = output.content.map((c: any) => (c?.text ?? "")).join("");
  } else if (output?.text) {
    text = output.text;
  } else {
    // fallback
    text = JSON.stringify(output);
  }

  // Try to extract first JSON blob from text (robust to leading/trailing markup)
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    // If parse fails, bubble an error with the raw text for debugging
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
    // For each requested field, call OpenAI. For larger fields, you may group fields into one request.
    for (const field of fields) {
      const value = product[field] ?? product[`${field}_raw`] ?? null;
      if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        // Skip missing/empty
        continue;
      }

      const prompt = buildPromptForField(field, value, lang);
      try {
        const parsed = await callOpenAIForField(prompt);
        // Expect parsed to be { "<field>": "<translated content>" } or the value itself
        if (parsed && typeof parsed === "object" && parsed[field] !== undefined) {
          langResult[field] = parsed[field];
        } else {
          // If the model returned the raw translated string
          if (typeof parsed === "string") langResult[field] = parsed;
          else langResult[field] = parsed;
        }
      } catch (err) {
        // On error, attach diagnostics inside the result so caller can decide
        langResult[field] = {
          _error: String((err as any).message || err),
          _raw: (err as any).raw ? ((err as any).raw + "").slice(0, 2000) : undefined
        };
      }
    }
    results[lang] = langResult;
  }

  return results;
}
