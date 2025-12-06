"use client";

/**
 * Bulk Operations page
 *
 * Perform actions on multiple products at once. Upload CSV files with
 * URLs or SKUs for batch ingestion, variant grouping, feed normalization
 * or auditing.
 */
export default function BulkPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Bulk Operations</h1>
      <p className="mb-4">
        Manage large sets of products more efficiently with CSV upload and
        batch processing features.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li><strong>Batch ingestion:</strong> upload a list of product URLs or SKUs for AvidiaExtract.</li>
        <li><strong>Variant grouping:</strong> automatically group SKUs into variants.</li>
        <li><strong>Feed normalization:</strong> ingest supplier feeds in CSV/XLSX format using AvidiaFeeds.</li>
        <li><strong>Audit & SEO at scale:</strong> run AvidiaAudit and AvidiaSEO on many items.</li>
      </ul>
    </div>
  );
}
