export const dynamic = "force-dynamic";

import Link from "next/link";

const toneExamples = [
  {
    tone: "Professional",
    example:
      "The Bosch GSB 18V-755 Cordless Combi Drill delivers 75 Nm of torque with a brushless motor, designed for demanding professional applications including concrete and masonry drilling.",
    useCase: "B2B, industrial supply, professional tools",
  },
  {
    tone: "Casual",
    example:
      "Meet your new go-to drill. The Bosch 18V Combi gives you serious power for everything from hanging shelves to DIY renovations — and the battery lasts all day.",
    useCase: "Consumer retail, home improvement, DIY",
  },
  {
    tone: "Technical",
    example:
      "GSB 18V-755: brushless EC motor, max torque 75 Nm (hard), 13mm keyless chuck, 2-speed gearbox (0–550/0–2,100 rpm), 25+1 torque settings. Kompatibel mit 18V Li-ion batteries.",
    useCase: "Technical buyers, procurement, specification matching",
  },
  {
    tone: "Medical / Clinical",
    example:
      "The 3M N95 Respirator 8210 provides NIOSH-approved particulate filtration efficiency ≥95% for non-oil aerosols. Indicated for use in healthcare environments and industrial settings requiring respiratory protection.",
    useCase: "Medical supply, healthcare, PPE",
  },
];

const outputFormats = [
  { format: "HTML", description: "Description wrapped in <p>, <ul>, <li> tags. Ready for Shopify/BigCommerce product description fields." },
  { format: "Plain text", description: "No markup. Clean text suitable for feeds, PDFs, or platforms that don't accept HTML." },
  { format: "Markdown", description: "Uses ** for bold, - for bullets. Ideal for Notion, GitHub, or headless CMS systems." },
];

const industryPresets = [
  { preset: "Medical / Clinical", notes: "Avoids superlatives and unverifiable claims. Uses clinical language and includes indication/contraindication framing." },
  { preset: "Industrial / MRO", notes: "Emphasizes specs, certifications, and compatibility. Uses trade terminology (MPN, ANSI, OSHA standards)." },
  { preset: "Consumer Electronics", notes: "Feature-benefit framing, accessibility-focused language, emphasizes user experience." },
  { preset: "Apparel / Soft Goods", notes: "Fabric composition, care instructions, fit notes. Sensory and lifestyle language." },
];

export default function DescribePage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          AI Modules
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          AvidiaDescribe — AI Product Descriptions
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate listing-ready product descriptions from structured data — at any scale, in any tone.
        </p>
      </div>

      {/* What it does */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          What AvidiaDescribe Does
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaDescribe takes the structured product data output from AvidiaExtract (or manually
          entered product data) and generates human-quality product copy. It produces multiple
          content types per run: a short description for search snippets, a long-form description
          for your product detail page, a bullet-point feature list, and a technical summary for
          spec sheets or B2B buyers.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Unlike generic AI writing tools, AvidiaDescribe is trained specifically on product content
          and avoids the vague, filler-heavy output that plagues general-purpose AI. Every
          description is grounded in the actual extracted specifications — no hallucinated claims.
        </p>
      </section>

      {/* Input/Output */}
      <section className="space-y-4" id="input-output">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Input and Output
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Input</p>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li>Extracted product data (from AvidiaExtract)</li>
              <li>Manual product data (name, brand, specs)</li>
              <li>Existing short description for enrichment</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Output</p>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <strong>Short description</strong> — 1–2 sentences, 150–200 chars
              </li>
              <li>
                <strong>Long description</strong> — 3–5 paragraphs, full prose
              </li>
              <li>
                <strong>Bullet points</strong> — 5–8 feature highlights
              </li>
              <li>
                <strong>Technical summary</strong> — spec-focused, structured
              </li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Example output — Bosch GSB 18V-755 Drill:</strong>
        </p>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Short Description
            </p>
          </div>
          <div className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm">
            Professional-grade brushless combi drill with 75 Nm torque and 13mm keyless chuck —
            built for drilling into concrete, masonry, and wood on a single 18V battery charge.
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-t border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Bullet Points
            </p>
          </div>
          <div className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>Brushless EC motor delivers 75 Nm hard torque for heavy-duty applications</li>
              <li>2-speed gearbox: 0–550 rpm (drilling) / 0–2,100 rpm (driving)</li>
              <li>13mm keyless chuck for fast, tool-free bit changes</li>
              <li>25+1 torque settings for precise screw-driving in any material</li>
              <li>Compatible with Bosch 18V ProCORE Li-ion batteries</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tone settings */}
      <section className="space-y-4" id="tone">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Tone Settings
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Select the tone that matches your brand voice and customer expectations. The same
          underlying product data will produce very different copy depending on the tone you choose.
        </p>
        <div className="space-y-3">
          {toneExamples.map((t) => (
            <div key={t.tone} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.tone}</p>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t.useCase}</span>
              </div>
              <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 italic">
                "{t.example}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Length and format */}
      <section className="space-y-4" id="format">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Length and Format Options
        </h2>
        <div className="space-y-2">
          {outputFormats.map((f) => (
            <div key={f.format} className="flex gap-3 text-sm">
              <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100 w-20">
                {f.format}
              </span>
              <span className="text-slate-600 dark:text-slate-300">{f.description}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Configure your default output format in{" "}
          <Link
            href="/dashboard/description-formats"
            className="text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Dashboard → Description Formats
          </Link>
          . You can also override the format per-request in the API.
        </p>
      </section>

      {/* Description formats / templates */}
      <section className="space-y-4" id="templates">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Description Templates
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Templates let you define the structure and emphasis of your descriptions. For example,
          you can create a template that always starts with a benefit statement, includes a
          compatibility note for industrial products, and ends with a warranty reminder.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Set up templates at{" "}
          <Link
            href="/dashboard/description-formats"
            className="text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            /dashboard/description-formats
          </Link>
          . Each template includes:
        </p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Template name (e.g., "Industrial MRO", "Consumer Electronics")</li>
          <li>Required sections (short description, long description, bullets, technical)</li>
          <li>Tone and length preferences</li>
          <li>Custom instructions (free-text directives to the AI model)</li>
          <li>Output format (HTML, plain text, Markdown)</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Templates can be set as defaults per product category, so a medical supply product
          automatically uses the clinical template while power tools use the professional template.
        </p>
      </section>

      {/* Industry presets */}
      <section className="space-y-4" id="presets">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Industry Presets
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If you don't want to build a custom template, use one of the built-in industry presets
          to get tuned output for your vertical:
        </p>
        <div className="space-y-2">
          {industryPresets.map((p) => (
            <div key={p.preset} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.preset}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.notes}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quality signals */}
      <section className="space-y-4" id="quality">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          What Makes a Good Description
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaDescribe scores each description internally before returning it. Here's what the
          model is optimizing for:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span>
              <strong>Specificity:</strong> references actual product data (model numbers,
              measurements, materials) rather than generic claims.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span>
              <strong>Feature-benefit framing:</strong> pairs each feature with a practical
              benefit. "Brushless motor (feature) means longer runtime and less maintenance
              (benefits)."
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span>
              <strong>No keyword stuffing:</strong> natural keyword integration, not repetition.
              SEO optimization is handled by AvidiaSEO, not by cramming keywords into the
              description.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500 shrink-0">✗</span>
            <span>
              <strong>Filler phrases:</strong> "This product is perfect for all your needs" —
              the model is tuned to avoid empty copy that doesn't communicate value.
            </span>
          </li>
        </ul>
      </section>

      {/* Regenerating */}
      <section className="space-y-4" id="regenerate">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Regenerating Descriptions
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If the generated description doesn't meet your quality bar, regenerate it from the
          product detail view. Click <strong>Regenerate Description</strong> — you can optionally
          add custom instructions (e.g., "emphasize that this product is FDA 510(k) cleared") to
          guide the next generation.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Previous versions are stored and accessible under the <strong>History</strong> tab — you
          can roll back to any prior version without consuming an additional credit.
        </p>
      </section>

      {/* Pricing */}
      <section className="space-y-3" id="pricing">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Credit Usage
        </h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
          AvidiaDescribe costs <strong>1 description credit</strong> per product per run. Regeneration within 24 hours of the original run is free. After 24 hours, regeneration consumes an additional credit.
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Check your available description credits in{" "}
          <Link href="/dashboard/pricing" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Dashboard → Billing
          </Link>
          .
        </p>
      </section>

      {/* API */}
      <section className="space-y-4" id="api">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          API: Generate a Description
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST https://app.avidiatech.com/api/v1/describe
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "tone": "professional",
  "format": "html",
  "length": "standard",
  "custom_instructions": "Mention that this product is NIOSH-approved."
}

// Response (200 OK)
{
  "id": "desc_01HX4K9ZTAB2N3VMCGP4REEF9",
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "short": "NIOSH-approved N95 respirator delivering ≥95% particulate filtration...",
  "long": "<p>The 3M N95 Respirator 8210 is NIOSH-approved for use in...</p>",
  "bullets": [
    "NIOSH-approved N95 particulate filtration efficiency ≥95%",
    "Lightweight flat-fold design fits in pocket or pouch",
    "Soft inner material reduces skin contact irritation",
    "Adjustable nose clip ensures secure, comfortable seal",
    "Tested to NIOSH 42 CFR Part 84 standards"
  ],
  "technical_summary": "Model: 8210 | Filtration: ≥95% non-oil | Style: Flat fold...",
  "credits_used": 1
}`}
        </pre>
      </section>
    </div>
  );
}
