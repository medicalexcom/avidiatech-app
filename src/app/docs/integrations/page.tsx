export const dynamic = "force-dynamic";

import Link from "next/link";

const pushableFields = [
  { field: "Product title", shopify: "title", bigcommerce: "name", woocommerce: "name" },
  { field: "Short description", shopify: "body_html (excerpt)", bigcommerce: "description", woocommerce: "short_description" },
  { field: "Long description", shopify: "body_html", bigcommerce: "description", woocommerce: "description" },
  { field: "Title tag (SEO)", shopify: "metafields_global_title_tag", bigcommerce: "page_title", woocommerce: "yoast_title / rank_math_title" },
  { field: "Meta description (SEO)", shopify: "metafields_global_description_tag", bigcommerce: "meta_description", woocommerce: "yoast_description" },
  { field: "Images", shopify: "images[ ]", bigcommerce: "images[ ]", woocommerce: "images[ ]" },
  { field: "Price", shopify: "variants[0].price", bigcommerce: "price", woocommerce: "regular_price" },
  { field: "SKU / MPN", shopify: "variants[0].sku", bigcommerce: "sku", woocommerce: "sku" },
  { field: "Availability", shopify: "variants[0].inventory_policy", bigcommerce: "availability", woocommerce: "stock_status" },
  { field: "Categories", shopify: "product_type / tags", bigcommerce: "categories[ ]", woocommerce: "categories[ ]" },
];

export default function IntegrationsPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Account
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Integrations & Connectors
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect AvidiaTech directly to Shopify, BigCommerce, or WooCommerce to push enriched
          product data without a manual export step.
        </p>
      </div>

      {/* Supported platforms */}
      <section className="space-y-4" id="platforms">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Supported Platforms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              name: "Shopify",
              status: "Full support",
              color: "emerald",
              notes: "Read + write products, metafields, and images via Admin API.",
            },
            {
              name: "BigCommerce",
              status: "Full support",
              color: "emerald",
              notes: "Read + write products, categories, custom fields via V3 API.",
            },
            {
              name: "WooCommerce",
              status: "Full support",
              color: "emerald",
              notes: "Read + write products via WooCommerce REST API (v3).",
            },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {p.status}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">{p.notes}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shopify setup */}
      <section className="space-y-4" id="shopify">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Setting Up Shopify
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The Shopify integration uses a custom private app (Admin API). Here's how to set it up:
        </p>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>
              In your Shopify Admin, go to{" "}
              <strong>Settings → Apps and sales channels → Develop apps</strong>. If prompted,
              enable custom app development for your store.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Click <strong>Create an app</strong>. Name it "AvidiaTech" for easy identification.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Under <strong>Configuration → Admin API access scopes</strong>, enable the following:
              <ul className="mt-2 ml-4 space-y-1 list-disc list-inside text-xs">
                <li>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">read_products</code> and{" "}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">write_products</code>
                </li>
                <li>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">read_product_listings</code>
                </li>
                <li>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">write_metafields</code> (for SEO fields)
                </li>
              </ul>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span>
              Click <strong>Save → Install app → Install</strong>. Copy the{" "}
              <strong>Admin API access token</strong> (shown once — save it securely).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              5
            </span>
            <span>
              In AvidiaTech, go to{" "}
              <Link href="/dashboard/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                Dashboard → Integrations → Add Integration → Shopify
              </Link>
              . Enter your store URL (e.g.,{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                mystore.myshopify.com
              </code>
              ) and paste your Admin API access token. Click <strong>Test Connection</strong>.
            </span>
          </li>
        </ol>
      </section>

      {/* BigCommerce setup */}
      <section className="space-y-4" id="bigcommerce">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Setting Up BigCommerce
        </h2>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>
              In BigCommerce Admin, go to{" "}
              <strong>Advanced Settings → API Accounts → Create API Account → V2/V3 API Token</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Name the account "AvidiaTech". Under OAuth Scopes, enable:{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Products: Modify</code>{" "}
              and{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Content: Modify</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Save and download the credentials file. You'll need your{" "}
              <strong>Store Hash</strong>,{" "}
              <strong>Client ID</strong>, and{" "}
              <strong>Access Token</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span>
              In AvidiaTech, go to{" "}
              <Link href="/dashboard/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                Integrations → Add → BigCommerce
              </Link>{" "}
              and enter all three credentials. Your store hash looks like{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                abc123xyz
              </code>
              {" "}(visible in your BigCommerce API URL).
            </span>
          </li>
        </ol>
      </section>

      {/* WooCommerce setup */}
      <section className="space-y-4" id="woocommerce">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Setting Up WooCommerce
        </h2>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>
              In WordPress Admin, go to{" "}
              <strong>WooCommerce → Settings → Advanced → REST API → Add Key</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Set the description to "AvidiaTech", select your admin user, and set permissions
              to <strong>Read/Write</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Generate the key. Copy the <strong>Consumer Key</strong> and{" "}
              <strong>Consumer Secret</strong> (shown once).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span>
              In AvidiaTech, go to{" "}
              <Link href="/dashboard/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                Integrations → Add → WooCommerce
              </Link>
              . Enter your store URL (e.g.,{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                https://mystore.com
              </code>
              ), Consumer Key, and Consumer Secret.
            </span>
          </li>
        </ol>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-300">
          <strong>Requirement:</strong> Your WooCommerce REST API must be accessible over HTTPS.
          HTTP-only stores are not supported for security reasons.
        </div>
      </section>

      {/* Pushable fields */}
      <section className="space-y-4" id="field-mapping">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Field Mapping
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaTech can push the following fields to each platform. By default, all available
          fields are pushed. Disable specific fields in the integration settings if you manage
          those fields directly in your store.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">AvidiaTech Field</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Shopify</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">BigCommerce</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">WooCommerce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {pushableFields.map((row) => (
                <tr key={row.field}>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-500 text-xs">
                    {row.shopify}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-500 text-xs">
                    {row.bigcommerce}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-500 text-xs">
                    {row.woocommerce}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sync frequency */}
      <section className="space-y-4" id="sync-frequency">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Sync Frequency
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Choose how and when AvidiaTech pushes data to your platform:
        </p>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100 w-28 shrink-0">Manual</span>
            <span>Push data on demand from the product detail view or via bulk action. Default for new integrations.</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100 w-28 shrink-0">Scheduled</span>
            <span>Push all updated products daily or weekly at a configured time. Useful for keeping your store in sync automatically.</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100 w-28 shrink-0">On Completion</span>
            <span>Push automatically when a pipeline run completes on a product. The most real-time option without webhooks.</span>
          </div>
        </div>
      </section>

      {/* Sync status */}
      <section className="space-y-4" id="sync-status">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Sync Status and Error Handling
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Each product shows a sync status badge in the product list: <strong>Synced</strong>,{" "}
          <strong>Pending</strong>, <strong>Failed</strong>, or <strong>Never Synced</strong>.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Failed syncs are retried automatically 3 times with exponential backoff. If all retries
          fail, the product is flagged with the error code. Common causes:
        </p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Product was deleted from the platform (404 error)</li>
          <li>API credentials expired or were revoked</li>
          <li>Rate limit hit on the platform side (429 error — retried automatically)</li>
          <li>Platform field validation error (e.g., title too long for platform limits)</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          View the full sync log for any product under{" "}
          <strong>Product Detail → Sync History</strong>.
        </p>
      </section>

      {/* Webhook */}
      <section className="space-y-4" id="webhooks">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Webhook Integration for Real-Time Sync
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          For real-time, event-driven sync, use AvidiaTech webhooks. Configure a webhook endpoint
          on your platform or middleware (Zapier, Make, n8n) to receive pipeline completion events
          and trigger your own sync logic.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          See the{" "}
          <Link href="/docs/webhooks" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Webhooks guide
          </Link>{" "}
          for event types and payload format.
        </p>
      </section>

      {/* API */}
      <section className="space-y-4" id="api">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Integration API
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`// List integrations
GET https://app.avidiatech.com/api/v1/integrations
Authorization: Bearer <your-api-key>

// Response
{
  "integrations": [
    {
      "id": "int_01HX5MN2QR4VP8XWBCJT5GA",
      "platform": "shopify",
      "store_url": "mystore.myshopify.com",
      "status": "connected",
      "last_sync": "2024-03-15T09:00:00Z"
    }
  ]
}

// Trigger a sync for a specific product
POST https://app.avidiatech.com/api/v1/integrations/int_01HX5MN2QR4VP8XWBCJT5GA/sync
{
  "ingestion_ids": ["ing_01HX4K2QZRP7W9VMBGT3DENF8"]
}

// Test connection
POST https://app.avidiatech.com/api/v1/integrations/int_01HX5MN2QR4VP8XWBCJT5GA/test
// Response: { "status": "ok", "latency_ms": 142 }`}
        </pre>
      </section>
    </div>
  );
}
