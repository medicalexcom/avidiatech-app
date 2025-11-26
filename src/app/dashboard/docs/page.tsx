"use client";

/**
 * Docs product page
 *
 * AvidiaDocs extracts structured information from technical manuals and PDF
 * documents.  It synthesizes complex content into actionable product data.
 */
export default function DocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Docs</h1>
      <p className="mb-4">
        AvidiaDocs extracts structured information from technical manuals and PDF
        documents.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Extracts specs, features, and tables from PDF manuals and data sheets</li>
        <li>Summarizes lengthy technical documents into digestible content</li>
        <li>Normalizes extracted specs for easy mapping to product attributes</li>
        <li>Integrates with our Extract and Specs modules to enrich product data</li>
      </ul>
    </div>
  );
}
