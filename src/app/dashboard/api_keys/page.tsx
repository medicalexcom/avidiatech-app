"use client";

/**
 * API Keys management page
 *
 * This page allows tenants to create, view and revoke API keys for
 * accessing the external AvidiaAPI.  API keys are tied to a tenant and
 * identified by a prefix and hashed key in the database【962839935143576†L130-L146】.
 */
export default function ApiKeysPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">API Keys</h1>
      <p className="mb-4">
        Manage your API keys for programmatic access to AvidiaTech.  API keys
        authenticate external clients and map calls back to your tenant【962839935143576†L136-L149】.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>Generate keys:</strong> create new keys with descriptive names
          for each integration; each key has a prefix and hashed secret stored
          securely【962839935143576†L136-L146】.
        </li>
        <li>
          <strong>Revoke or rotate:</strong> deactivate keys that are no longer
          needed or rotate them regularly for security【962839935143576†L136-L149】.
        </li>
        <li>
          <strong>Documentation:</strong> copy code snippets showing how to use
          your API key with the REST endpoints (ingest, SEO, variants, etc.)【962839935143576†L318-L336】.
        </li>
        <li>
          <strong>Usage monitoring:</strong> track API calls per key and view
          usage against your plan’s quota.
        </li>
      </ul>
    </div>
  );
}
