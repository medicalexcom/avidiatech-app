"use client";

export default function AnalyticsPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Analytics & Reporting</h1>
      <p className="mb-4">
        View usage statistics, supplier performance and SEO/audit insights for your catalog.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li><strong>Ingestion volumes:</strong> monthly counts of URLs, variants, docs and SEO calls.</li>
        <li><strong>Top suppliers:</strong> ranking of brands and categories by volume.</li>
        <li><strong>Audit & SEO metrics:</strong> pass/warn/fail counts and SEO score trends.</li>
        <li><strong>User activity:</strong> track team actions like ingests, edits and audits.</li>
      </ul>
    </div>
  );
}
