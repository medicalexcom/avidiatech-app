/**
 * assembleSeoPrompt.ts
 *
 * Builds the system + user messages for the SEO model call.
 *
 * - Uses the canonical tenant/custom instructions (if provided) and appends
 *   a strict, placeholder-based template that requires the exact sections:
 *     Hook (intro + bullets), Main Description (H2), Features and Benefits (H2 + H3 groups + bullets),
 *     Product Specifications (H2 + grouped bullets), Internal Links (2),
 *     Why Choose (H2 + bullets), Manuals (conditional), FAQs (5-7), SEO metadata (h1/title/meta)
 *
 * - The template uses placeholders (NOT concrete example copy) and explicitly
 *   forbids copying placeholders verbatim. It requires the model to produce
 *   only the structured JSON/HTML requested (no commentary).
 *
 * - The returned object shape is { system: string, user: string } ready to pass
 *   to callOpenaiChat.
 */

type AnyObj = Record<string, any>;

export function assembleSeoPrompt(opts: {
  instructions?: string | null;
  extractData?: AnyObj;
  manufacturerText?: string | null;
}) {
  const { instructions, extractData, manufacturerText } = opts;

  // Strict structural template (placeholders only — no literal example text)
  const structureTemplate = `
STRICT STRUCTURE & TEMPLATE (MUST FOLLOW)
- Return ONLY a single JSON object (no commentary, no markdown, no fences) matching EXACTLY this shape:
{
  "hook_html": "<p>{HOOK_INTRO_HTML}</p><ul>{HOOK_BULLETS_HTML}</ul>",
  "main_description_title": "{MAIN_H2_TITLE}",
  "main_description_html": "<p>{MAIN_PARAGRAPH_1}</p><p>{MAIN_PARAGRAPH_2}</p>",
  "features_html": "<h3>{GROUP1_H3}</h3><ul>{GROUP1_BULLETS}</ul><h3>{GROUP2_H3}</h3><ul>{GROUP2_BULLETS}</ul>",
  "specs_html": "<h3>{SPECS_GROUP_H3}</h3><ul>{SPECS_BULLETS}</ul>",
  "internal_links": [{ "type":"subcategory","anchor":"See all {CATEGORY}","url":"/{category-slug}/" }, { "type":"brand","anchor":"Shop more {BRAND}","url":"/{brand-slug}/" }],
  "why_choose_title": "{WHY_CHOOSE_H2}",
  "why_choose_html": "<p>{WHY_CHOOSE_LEAD}</p><ul>{WHY_CHOOSE_BULLETS}</ul>",
  "manuals_html": "<ul>{MANUAL_LINKS}</ul>",            // include only when manuals exist
  "faqs_html": "<h3>Q1</h3><p>A1</p>... (5-7 Q&A pairs required)",
  "seo_payload": { "h1": "{H1_TEXT}", "title": "{META_TITLE}", "metaDescription": "{META_DESCRIPTION}" },
  "features_list": ["{feature1}", "{feature2}"]         // machine-friendly features array
}

REQUIREMENTS & RULES (MUST FOLLOW)
1) DO NOT COPY OR REUSE the placeholder text inside curly braces ({...}); placeholders are templates only.
2) Use ONLY the provided extractData and manufacturerText for grounding. Do NOT invent facts.
3) If a fact is missing, omit the specific line and record the gap (machine: add empty string or empty array).
4) Hook bullets: 3–6 short bullets (<25 words) in an unordered list (<ul><li>…</li></ul>).
5) Features: 2–4 H3 groups and 3–6 total feature bullets across groups.
6) Specs: group technical specs into logical H3 groups, follow pattern <li><strong>Label</strong>: value</li>.
7) FAQs: 5–7 Q&A pairs. Each question uses <h3> and each answer a <p>.
8) Manuals: include only when input provides validated pdf/manual links.
9) Metadata: h1 must be product name (or derived short_name); meta title 60–65 chars; metaDescription 150–160 chars if possible.
10) Return plain HTML fragments for *_html fields (no markdown). The server will assemble them into full page HTML.

IMPORTANT: If you cannot produce the full structured output from the input, still return the JSON object above but use empty strings/empty arrays for missing fields.`;

  // Compose system message
  const systemParts: string[] = [];
  if (instructions && typeof instructions === "string" && instructions.trim().length > 0) {
    systemParts.push(`CANONICAL INSTRUCTIONS (tenant/canonical):\n${instructions.trim()}`);
  } else {
    systemParts.push(`CANONICAL INSTRUCTIONS: (not available)`);
  }
  systemParts.push(structureTemplate);

  const system = systemParts.join("\n\n");

  // Compose user message: the grounding data the model must use
  const userPayload = {
    extractData: extractData ?? {},
    manufacturerText: manufacturerText ?? "",
    note: "Use ONLY fields inside extractData and manufacturerText for grounded content. Do not invent or assume missing numeric specs."
  };

  const user = JSON.stringify(userPayload, null, 2);

  return { system, user };
}
