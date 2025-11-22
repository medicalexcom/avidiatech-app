/**
 * API product page
 *
 * AvidiaAPI exposes your product data and extraction capabilities through a
 * unified REST API.  Developers can integrate ingestion, description, variant
 * grouping, and more into their own applications.
 */
export default function ApiPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">API</h1>
      <p className="mb-4">
        AvidiaAPI exposes your product data and extraction capabilities through
        a unified REST API.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Provides a unified REST API for programmatically accessing your product data</li>
        <li>Enables ingestion, description generation, variant grouping, and more via endpoints</li>
        <li>Authenticates requests with API keys tied to your tenant</li>
        <li>Supports pagination, filtering, and sorting for large datasets</li>
      </ul>
    </div>
  );
}
