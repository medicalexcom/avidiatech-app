"use client";

/**
 * Translate product page
 *
 * AvidiaTranslate localizes your product content into multiple languages while
 * preserving context, units, and brand voice.
 */
export default function TranslatePage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Translate</h1>
      <p className="mb-4">
        AvidiaTranslate localizes your product content into multiple languages while
        preserving context and brand voice.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Translates product content into multiple languages with contextual accuracy</li>
        <li>Maintains brand voice and measurement units across locales</li>
        <li>Supports localized SEO keywords and market‑specific variations</li>
        <li>Works alongside our Specs and Describe modules to produce global product data</li>
      </ul>
    </div>
  );
}
