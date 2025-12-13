import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";

const CENTRAL_GPT_URL = process.env.CENTRAL_GPT_URL || "";
const CENTRAL_GPT_KEY = process.env.CENTRAL_GPT_KEY || "";

export async function callSeoModel(
  normalizedPayload: any,
  correlationId?: string | null,
  sourceUrl?: string | null,
  tenantId?: string | null
): Promise<{
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
}> {
  if (!CENTRAL_GPT_URL || !CENTRAL_GPT_KEY) {
    throw new Error("central_gpt_not_configured: CENTRAL_GPT_URL / CENTRAL_GPT_KEY missing");
  }

  const { text: instructions, source: instructionsSource } =
    await loadCustomGptInstructionsWithInfo(tenantId ?? null);

  const defaultBuildSeoRequestBody = ({
    module = "seo",
    payload,
    correlationId,
    customInstructions,
    instructionsSource,
  }: {
    module?: string;
    payload: any;
    correlationId?: string | null;
    customInstructions?: string | null;
    instructionsSource?: string | null;
  }) => {
    const trimmedInstructions =
      typeof customInstructions === "string" ? customInstructions.trim() : "";

    return {
      module,
      payload,
      correlation_id: correlationId || undefined,
      custom_gpt_instructions: trimmedInstructions.length > 0 ? trimmedInstructions : undefined,
      instruction_source: instructionsSource || undefined,
      enforce_instructions: trimmedInstructions.length > 0,
      audit: { format: "avidia_seo_v1" },
    };
  };

  let buildSeoRequestBody: ((opts: any) => any) | null = defaultBuildSeoRequestBody;
  try {
    const enforcerPath = path.join(
      process.cwd(),
      "../medx-ingest-api/tools/render-engine/gptInstructionsEnforcer.mjs"
    );
    if (fs.existsSync(enforcerPath)) {
      const enforcerModulePath = pathToFileURL(enforcerPath).toString();
      const enforcerModule = await import(enforcerModulePath);
      buildSeoRequestBody =
        (enforcerModule as any).buildSeoRequestBody ||
        (enforcerModule as any).default?.buildSeoRequestBody ||
        buildSeoRequestBody;
      console.log("[api/v1/seo] using shared gptInstructionsEnforcer module");
    } else {
      console.log(
        "[api/v1/seo] shared gptInstructionsEnforcer not present; using built-in body builder"
      );
    }
  } catch (err: any) {
    console.warn(
      "[api/v1/seo] unable to load shared gptInstructionsEnforcer",
      err?.message || err
    );
  }

  const body = buildSeoRequestBody
    ? buildSeoRequestBody({
        module: "seo",
        payload: normalizedPayload,
        correlationId: correlationId || undefined,
        customInstructions: instructions,
        instructionsSource,
      })
    : {
        module: "seo",
        payload: normalizedPayload,
        correlation_id: correlationId || undefined,
        custom_gpt_instructions: instructions || undefined,
        instruction_source: instructionsSource || undefined,
        enforce_instructions: Boolean(instructions),
      };

  const res = await fetch(CENTRAL_GPT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${CENTRAL_GPT_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[api/v1/seo] central GPT non-200", res.status, text?.slice(0, 500));
    throw new Error(`central_gpt_seo_error: ${res.status} ${text || "(empty body)"}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (err: any) {
    console.error("[api/v1/seo] central GPT returned non-JSON", err?.message || err, "raw=", text?.slice(0, 500));
    throw new Error("central_gpt_invalid_json");
  }

  const normalized = normalizedPayload || {};
  const seoPayload = json?.seo || normalized?.seo || {};
  const descriptionHtml =
    json?.description_html || json?.description || normalized?.description_html || null;
  const features = Array.isArray(json?.features) ? json.features : normalized?.features ?? null;

  console.log("[api/v1/seo] central GPT SEO summary", {
    hasSeo: !!seoPayload,
    hasDescription: !!descriptionHtml,
    featuresCount: Array.isArray(features) ? features.length : null,
    sourceUrl: sourceUrl || null,
    instructionsSource: instructionsSource || null,
  });

  return {
    seo_payload: seoPayload,
    description_html: descriptionHtml,
    features,
  };
}
