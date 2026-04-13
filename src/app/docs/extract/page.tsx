export const dynamic = "force-dynamic";

import Link from "next/link";

const extractedFields = [
  { field: "product_name", example: "3M N95 Particulate Respirator 8210, 20/Box", notes: "Full product title as listed by manufacturer" },
  { field: "brand", example: "3M", notes: "Manufacturer or brand name" },
  { field: "sku", example: "8210", notes: "Manufacturer part number or SKU" },
  { field: "description", example: "NIOSH-approved N95 respirator...", notes: "Raw manufacturer description text" },
  { field: "specifications", example: '{"filtration_efficiency": "≥95%", "style": "flat fold"}', notes: "Key-value pairs from spec tables" },
  { field: "images", example: '["https://cdn.3m.com/..."]', notes: "All product image URLs found on the page" },
  { field: "dimensions", example: '{"length": "5.5in", "width": "3.5in"}', notes: "Physical size, extracted from specs or product data" },
  { field: "weight", example: "4.5 oz", notes: "Shipping or product weight" },
  { field: "price", example: "24.99", notes: "Listed price if publicly available" },
  { field: "availability", example: "in_stock", notes: "in_stock, out_of_stock, or discontinued" },
  { field: "categories", example: '["Safety", "Respiratory Protection", "N95"]', notes: "Breadcrumb or taxonomy categories from page" },
  { field: "upc", example: "00051131070141", notes: "UPC/EAN barcode if present" },
];

const commonErrors = [
  {
    code: "FETCH_BLOCKED",
    cause: "The page returned a 403 or CAPTCHA block.",
    fix: "Try the manufacturer's direct product URL rather than a category or search page. Some pages require the browser extension for JavaScript-heavy rendering.",
  },
  {
    code: "LOW_CONTENT",
    cause: "Extracted fewer than 3 fields — page may be JS-rendered or behind auth.",
    fix: "Use the AvidiaExtract browser extension, which runs extraction in your browser session and can access pages that require login or JavaScript.",
  },
  {
    code: "PDF_PARSE_ERROR",
    cause: "Uploaded PDF was image-only (scanned, not machine-readable).",
    fix: "Run OCR on the PDF before uploading, or request a text-based datasheet directly from your supplier.",
  },
  {
    code: "TIMEOUT",
    cause: "Page took more than 30 seconds to respond.",
    fix: "Check if the URL is publicly accessible. Try reprocessing — some slow supplier sites are intermittently slow.",
  },
  {
    code: "DUPLICATE_URL",
    cause: "This URL was already extracted and has an existing ingestion record.",
    fix: "Find the existing record in your product list, or use the reprocess option to force a fresh extraction.",
  },
];

export default function ExtractPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          AI Modules
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          AvidiaExtract — Product Data Extraction
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Fetch any manufacturer or supplier product page and extract clean, structured data automatically.
        </p>
      </div>

      {/* What it does */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          What AvidiaExtract Does
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaExtract fetches a product URL — from a manufacturer, distributor, or supplier — and
          uses AI to parse the page into structured JSON fields. It handles HTML product pages, PDF
          datasheets, and JavaScript-rendered sites (with the browser extension).
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The output is a normalized product record you can use as the input for all downstream
          modules: AvidiaDescribe for copy generation, AvidiaSEO for optimization, and your
          eCommerce platform for direct import.
        </p>
      </section>

      {/* Supported inputs */}
      <section className="space-y-4" id="inputs">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Supported Input Types
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>
              <strong>Single URL</strong> — paste any product URL into the Extract UI and hit
              Extract. Ideal for testing and one-off products.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>
              <strong>Batch URL list</strong> — paste up to 50 URLs at once using the bulk input
              field (newline-separated).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>
              <strong>CSV import</strong> — upload a CSV with a{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">url</code>{" "}
              column to start a bulk extraction job. See the{" "}
              <Link href="/docs/import" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                Import guide
              </Link>{" "}
              for column requirements.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>
              <strong>API</strong> — submit extraction requests programmatically via{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                POST /api/v1/ingest
              </code>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>
              <strong>PDF datasheets</strong> — upload PDF files directly for extraction. Works
              best with machine-readable (non-scanned) PDFs.
            </span>
          </li>
        </ul>
      </section>

      {/* Extracted fields */}
      <section className="space-y-4" id="fields">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Extracted Fields
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaExtract attempts to populate the following fields from every product page. Fields
          that cannot be found are returned as <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">null</code>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Field</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Example Value</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {extractedFields.map((row) => (
                <tr key={row.field} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-2.5 font-mono text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {row.example}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-500">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4" id="how-it-works">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          How Extraction Works
        </h2>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 text-xs font-bold text-slate-400 w-5 pt-0.5">1.</span>
            <span>
              <strong>Fetch:</strong> AvidiaTech's crawler fetches the HTML source of the URL,
              following redirects and handling standard HTTP headers. Pages that require JavaScript
              rendering fall back to a headless browser.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-xs font-bold text-slate-400 w-5 pt-0.5">2.</span>
            <span>
              <strong>AI Parsing:</strong> The raw HTML is sent to the extraction model, which
              identifies product data signals — spec tables, structured data (JSON-LD,
              microdata), image tags, pricing elements, and description blocks.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-xs font-bold text-slate-400 w-5 pt-0.5">3.</span>
            <span>
              <strong>Field Normalization:</strong> Raw values are normalized — units are
              standardized (e.g., "5 lbs" → <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{`{"value": 5, "unit": "lb"}`}</code>),
              prices are stripped of currency symbols, and image URLs are resolved to absolute paths.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-xs font-bold text-slate-400 w-5 pt-0.5">4.</span>
            <span>
              <strong>JSON Output:</strong> The normalized record is stored as an ingestion and
              made available in the UI, via the API, and as input to downstream modules.
            </span>
          </li>
        </ol>
      </section>

      {/* Difficult pages */}
      <section className="space-y-4" id="difficult-pages">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Handling Difficult Pages
        </h2>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              JavaScript-heavy sites
            </h3>
            <p>
              Sites like Grainger, MSC Direct, or custom B2B portals often load product data
              dynamically via JavaScript. Standard HTTP fetching captures an empty or skeleton page.
              Use the{" "}
              <Link href="/docs/browser" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                AvidiaExtract browser extension
              </Link>{" "}
              to extract from a fully rendered page in your Chrome session.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              PDF datasheets
            </h3>
            <p>
              Upload PDFs via the Extract UI or via{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                POST /api/v1/ingest
              </code>{" "}
              with <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">type: "pdf"</code>.
              Machine-readable PDFs (text-based) extract cleanly. Scanned image-only PDFs require
              OCR preprocessing.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Private / login-required pages
            </h3>
            <p>
              Distributor portals and private supplier catalogs often require authentication.
              The browser extension can extract from authenticated sessions. Alternatively, export
              the product data to CSV from the portal and use AvidiaTech's CSV import to ingest it.
            </p>
          </div>
        </div>
      </section>

      {/* Quality scores */}
      <section className="space-y-4" id="quality-scores">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Understanding Extraction Quality Scores
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every extraction is assigned a quality score from 0 to 100. This score reflects how
          completely the system was able to populate the standard field set.
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs text-center">
          {[
            { range: "80–100", label: "Excellent", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
            { range: "50–79", label: "Good", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
            { range: "0–49", label: "Review Needed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
          ].map((s) => (
            <div key={s.range} className={`rounded-lg p-3 ${s.color}`}>
              <p className="text-lg font-bold">{s.range}</p>
              <p className="mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Scores below 50 typically mean critical fields like product name, description, or
          specifications could not be found. Filter your product list by score using the{" "}
          <strong>Score &lt; 50</strong> filter to identify products that need manual review or
          reprocessing.
        </p>
      </section>

      {/* Reprocessing */}
      <section className="space-y-4" id="reprocessing">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Reprocessing Failed Extractions
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If an extraction fails or produces a low-quality result, you can reprocess it without
          consuming an additional extraction credit (first reprocess is free). From the product
          detail view, click <strong>Reprocess</strong> → choose whether to use the cached page or
          re-fetch the URL.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Via the API, set <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{`"reprocess": true`}</code> in your ingest request body to force a fresh extraction even if a cached result exists.
        </p>
      </section>

      {/* Rate limits */}
      <section className="space-y-4" id="rate-limits">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Rate Limits and Quotas
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Monthly Extractions</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Concurrent Jobs</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">API Rate Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {[
                ["Starter", "100", "2", "60 req/min"],
                ["Growth", "5,000", "10", "300 req/min"],
                ["Scale", "Unlimited", "50", "1,000 req/min"],
              ].map(([plan, extractions, concurrent, api]) => (
                <tr key={plan}>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{plan}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{extractions}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{concurrent}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{api}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API */}
      <section className="space-y-4" id="api">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          API: Submit an Extraction
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST https://app.avidiatech.com/api/v1/ingest
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "url": "https://www.boschtools.com/us/en/boschtools-ocs/cordless-drill-drivers-gsb-18v-755-06019H3110.html",
  "options": {
    "reprocess": false,
    "pipeline": ["extract", "describe", "seo"]
  }
}

// Response (202 Accepted)
{
  "id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "status": "queued",
  "created_at": "2024-03-15T14:22:00Z",
  "url": "https://www.boschtools.com/..."
}`}
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Poll the result with{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
            GET /api/v1/ingest/:id
          </code>{" "}
          or set up a webhook to be notified on completion. See the full{" "}
          <Link href="/docs/api" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            API Reference
          </Link>
          .
        </p>
      </section>

      {/* Common errors */}
      <section className="space-y-4" id="errors">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Common Errors and Fixes
        </h2>
        <div className="space-y-3">
          {commonErrors.map((e) => (
            <div
              key={e.code}
              className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-1"
            >
              <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{e.code}</p>
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

      {/* Tips */}
      <section className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Tips for Best Results
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Always use the <strong>manufacturer's own product page</strong>, not a retailer listing.
            Manufacturer pages have specification tables, official images, and authoritative data
            that score 10–20 points higher on average.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Ensure the URL is <strong>publicly accessible</strong> — test it in an incognito browser
            window before submitting.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            For product families (e.g., Bosch 18V drill with multiple SKUs), extract the{" "}
            <strong>specific variant URL</strong>, not the product family overview page.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Include the <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">sku</code>{" "}
            field in your CSV imports — it helps deduplicate products and match records to your
            existing catalog.
          </li>
        </ul>
      </section>
    </div>
  );
}
