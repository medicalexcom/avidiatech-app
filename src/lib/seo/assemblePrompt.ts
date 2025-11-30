import { loadCustomGptInstructions } from "@/lib/gpt/loadInstructions";

type AssembleArgs = {
  instructions?: any;
  extractData: any; // normalized payload from ingest
  manufacturerText?: string;
};

export function assembleSeoPrompt({ instructions, extractData, manufacturerText = "" }: AssembleArgs) {
  // Instructions may include system boilerplate, style rules, and constraints
  const systemParts: string[] = [
    "You are AvidiaSEO — produce strict JSON output only. Do NOT add explanations.",
    "Output must be valid JSON matching the contract: { description_html, seo_payload:{h1,title,metaDescription,shortDescription}, features:[] }",
  ];

  if (instructions?.system) systemParts.unshift(instructions.system);

  // Build a compact user payload composed only of normalized keys
  const userPayload = {
    source_url: extractData?.source || extractData?.source_url || "",
    product: {
      name: extractData?.name_raw || extractData?.name || "",
      description_raw: extractData?.description_raw || "",
      features_raw: extractData?.features_raw || extractData?.features || [],
      specs_normalized: extractData?.specs_normalized || {},
      manuals_normalized: extractData?.manuals_normalized || {},
      variants_normalized: extractData?.variants_normalized || {},
      images_normalized: extractData?.images_normalized || {},
      source_seo: extractData?.source_seo || {}
    },
    manufacturer_text: manufacturerText || ""
  };

  // If tenant provides instruction blocks for style/meta, include them
  const system = systemParts.join("\n\n");
  const user = {
    context: "Use ONLY the data in this JSON to produce an SEO description and canonical SEO fields.",
    data: userPayload,
    output_contract: {
      description_html: "HTML string. Allowed tags: p, h1,h2,h3,ul,ol,li,strong,em,a",
      seo_payload: { h1: "string", title: "string", metaDescription: "string", shortDescription: "string" },
      features: ["string"]
    },
    instructions_flags: {
      strict_json_only: true,
      max_h1_length: 70,
      max_title_length: 60,
      max_meta_length: 160
    }
  };

  return { system, user };
}
