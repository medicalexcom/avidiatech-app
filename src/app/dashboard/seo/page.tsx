"use client";

/**
 * SEO product page
 *
 * AvidiaSEO generates SEO‑optimized content for your products.  It produces
 * compelling titles, descriptions, and meta tags using trending keywords and
 * best practices.
 */
export default function SeoPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">SEO</h1>
      <p className="mb-4">
        AvidiaSEO generates SEO‑optimized content for your products.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Generates SEO‑optimized product titles, descriptions, and meta tags</li>
        <li>Uses trending keywords and natural language to improve search visibility</li>
        <li>Creates targeted content for multiple marketplaces or channels</li>
        <li>Integrates seamlessly with Extract and Describe to augment ingested data</li>
      </ul>
    </div>
  );
}
