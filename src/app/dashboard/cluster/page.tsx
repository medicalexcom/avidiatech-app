"use client";

/**
 * Cluster product page
 *
 * AvidiaCluster groups similar products together using machine learning to
 * simplify taxonomy management and deduplication.
 */
export default function ClusterPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">Cluster</h1>
      <p className="mb-4">
        AvidiaCluster groups similar products together using machine learning to
        simplify taxonomy management and deduplication.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Clusters similar products to simplify category assignments</li>
        <li>Identifies duplicate products and suggests merges</li>
        <li>Learns from your taxonomy to suggest new categories</li>
        <li>Outputs clusters and similarity scores for further analysis</li>
      </ul>
    </div>
  );
}
