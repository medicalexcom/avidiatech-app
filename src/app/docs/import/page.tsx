export const dynamic = "force-dynamic";

import Link from "next/link";

const csvColumns = [
  { column: "url", required: true, description: "Full product URL to extract from (manufacturer or supplier page)" },
  { column: "sku", required: false, description: "Your internal SKU or manufacturer part number — used for deduplication" },
  { column: "name", required: false, description: "Known product name — pre-fills the extracted name field if provided" },
  { column: "brand", required: false, description: "Brand or manufacturer name" },
  { column: "category", required: false, description: "Your internal category (e.g., 'Power Tools', 'Medical PPE')" },
  { column: "price", required: false, description: "Your selling price — not extracted, passed through directly" },
  { column: "description", required: false, description: "Existing description — used as context for AvidiaDescribe if provided" },
  { column: "upc", required: false, description: "UPC/EAN — used for matching and deduplication" },
];

const importErrors = [
  {
    error: "Missing required column: url",
    cause: "Your CSV doesn't have a column named 'url' (case-sensitive).",
    fix: 'Rename the column to "url" or use the column mapping step to assign the correct column.',
  },
  {
    error: "Invalid URL format (row 14)",
    cause: "The URL in row 14 doesn't start with http:// or https://.",
    fix: 'Ensure all URLs include the full protocol. Fix the row and re-upload, or skip it using the "Skip invalid rows" option.',
  },
  {
    error: "Duplicate URL detected",
    cause: "One or more rows contain a URL that already exists in your product catalog.",
    fix: 'Select "Skip duplicates" (default) or "Reprocess duplicates" during import configuration.',
  },
  {
    error: "Quota exceeded",
    cause: "The number of rows in your CSV exceeds your remaining extraction credit balance.",
    fix: 'Top up your credits in Billing, or use the "Limit to N products" option to import a subset.',
  },
  {
    error: "File too large",
    cause: "CSV file exceeds the maximum size for your plan.",
    fix: "Split your CSV into smaller files (under the limit) and upload in batches.",
  },
];

const planLimits = [
  { plan: "Starter", maxRows: "500 rows", maxFileSize: "5 MB", bulkConcurrent: "2 jobs" },
  { plan: "Growth", maxRows: "10,000 rows", maxFileSize: "50 MB", bulkConcurrent: "10 jobs" },
  { plan: "Scale", maxRows: "Unlimited", maxFileSize: "250 MB", bulkConcurrent: "50 jobs" },
];

export default function ImportPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Commerce
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Import & Data Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bring your existing product catalog into AvidiaTech via CSV, platform exports, or direct
          connector sync.
        </p>
      </div>

      {/* Supported formats */}
      <section className="space-y-4" id="formats">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Supported Import Formats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              label: "CSV (Universal)",
              description: "Any CSV with a url column. The most flexible option.",
              badge: "Recommended",
            },
            {
              label: "JSON",
              description: "Array of product objects. Useful when feeding from another system.",
              badge: null,
            },
            {
              label: "Shopify Product Export",
              description: "Direct export from Shopify admin → Products → Export. No column mapping needed.",
              badge: null,
            },
            {
              label: "BigCommerce Export",
              description: "Export from BigCommerce → Products → Export. Auto-detected column format.",
              badge: null,
            },
          ].map((fmt) => (
            <div key={fmt.label} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt.label}</p>
                {fmt.badge && (
                  <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {fmt.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{fmt.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CSV columns */}
      <section className="space-y-4" id="csv-columns">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          CSV Column Reference
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The minimum viable CSV has a single column:{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">url</code>.
          Additional columns enrich the extracted records and improve pipeline quality.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`url,sku,name,brand,category,price
https://www.3m.com/3M/en_US/p/d/v000057867/,8210,3M N95 Respirator,3M,Medical PPE,24.99
https://www.boschtools.com/.../GSB-18V-755,GSB18V755,Bosch 18V Combi Drill,Bosch,Power Tools,189.00
https://www.medline.com/product/SensiCare-Gloves/Z05-PF18255,MIIMDS195085,Medline Gloves,Medline,Gloves,`}
        </pre>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Column</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Required</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {csvColumns.map((col) => (
                <tr key={col.column}>
                  <td className="px-4 py-2.5 font-mono text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                    {col.column}
                  </td>
                  <td className="px-4 py-2.5">
                    {col.required ? (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">Required</span>
                    ) : (
                      <span className="text-xs text-slate-400">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Column mapping */}
      <section className="space-y-4" id="column-mapping">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Column Mapping
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If your CSV uses different column names (e.g., "Product URL" instead of "url",
          "Item Number" instead of "sku"), the column mapping step lets you assign your columns
          to AvidiaTech's standard fields.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          After uploading your file, you'll see a mapping UI that shows your CSV columns on the
          left and AvidiaTech fields on the right. Drag and drop — or use the dropdowns — to
          assign each column. Unmapped columns are ignored.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Save your mapping as a template if you regularly import from the same source (e.g.,
          your Grainger export always has the same column names).
        </p>
      </section>

      {/* Import validation */}
      <section className="space-y-4" id="validation">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Import Validation
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Before processing begins, AvidiaTech validates every row in your import. Validation checks
          for:
        </p>
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <strong>URL format:</strong> must start with http:// or https:// and be a valid URL structure
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <strong>Required fields:</strong> url column must be present and non-empty
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <strong>Deduplication:</strong> rows with URLs already in your catalog are flagged
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <strong>Encoding:</strong> file is valid UTF-8 CSV with consistent delimiters
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            <strong>Quota check:</strong> row count is compared against your remaining credit balance
          </li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Validation results appear before you confirm the import. You can choose to skip invalid
          rows and proceed with valid rows, or fix the file and re-upload.
        </p>
      </section>

      {/* Bulk processing */}
      <section className="space-y-4" id="bulk-processing">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Bulk Processing After Import
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Once your CSV is imported, you can trigger pipeline runs on all imported products from the
          import confirmation screen or later from the Products list.
        </p>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>From the import success screen, click <strong>Run Pipeline on All Imported Products</strong>.</li>
          <li>Select which modules to run: Extract only, Extract + Describe, Extract + Describe + SEO, or the full pipeline.</li>
          <li>Confirm credit usage and start the bulk job.</li>
          <li>Monitor progress in real time under <Link href="/imports/new" className="text-cyan-600 dark:text-cyan-400 hover:underline">Dashboard → Imports → Bulk Jobs</Link>.</li>
        </ol>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-300">
          <strong>Credit note:</strong> Each module in the pipeline consumes credits per product.
          A full pipeline (Extract + Describe + SEO) on 500 products costs 500 extraction + 500
          description + 500 SEO credits.
        </div>
      </section>

      {/* Import history */}
      <section className="space-y-4" id="history">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Import History and Error Logs
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every import is logged and accessible from{" "}
          <Link href="/imports/new" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Dashboard → Imports
          </Link>
          . Each import record shows:
        </p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Import date, file name, and row count</li>
          <li>Number of rows processed, succeeded, and failed</li>
          <li>Downloadable error log (CSV) listing failed rows with error codes</li>
          <li>Link to the products created by the import</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Download the error log, fix the failing rows, and re-import just the failed rows to
          minimize credit waste.
        </p>
      </section>

      {/* Connector sync */}
      <section className="space-y-4" id="connector-sync">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Connector Sync (Shopify / BigCommerce / WooCommerce)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If you have a platform integration connected, you can import products directly from your
          store — no CSV required. From{" "}
          <Link href="/imports/new" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Dashboard → Import
          </Link>
          , select <strong>Import from Store</strong> and choose your connected store.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          You can filter which products to import: by collection, product type, vendor, tag, or
          products updated within a date range. AvidiaTech imports the product metadata and uses
          the existing product URL (from the platform) as the extraction source.
        </p>
      </section>

      {/* Export */}
      <section className="space-y-4" id="export">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Exporting Processed Data
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Once products have been processed through the pipeline, you can export the enriched data:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong>CSV export:</strong> Go to Products → select products → Export. Choose which
            fields to include (all fields, or only SEO fields, or only descriptions).
          </li>
          <li>
            <strong>Direct push to platform:</strong> Use the integration to push processed data
            directly to Shopify, BigCommerce, or WooCommerce. See the{" "}
            <Link href="/docs/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Integrations guide
            </Link>
            .
          </li>
          <li>
            <strong>API:</strong> Retrieve processed data programmatically via{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              GET /api/v1/ingest/:id
            </code>
            .
          </li>
        </ul>
      </section>

      {/* Common errors */}
      <section className="space-y-4" id="errors">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Handling Import Errors
        </h2>
        <div className="space-y-3">
          {importErrors.map((e) => (
            <div key={e.error} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{e.error}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Cause:</strong> {e.cause}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Fix:</strong> {e.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Plan limits */}
      <section className="space-y-4" id="limits">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Import Limits by Plan
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Max Rows / Import</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Max File Size</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Concurrent Bulk Jobs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {planLimits.map((row) => (
                <tr key={row.plan}>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{row.plan}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.maxRows}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.maxFileSize}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.bulkConcurrent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Need higher limits?{" "}
          <Link href="/dashboard/pricing" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Upgrade your plan
          </Link>{" "}
          or contact us to discuss a custom arrangement for large catalogs.
        </p>
      </section>
    </div>
  );
}
