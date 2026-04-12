export const dynamic = "force-dynamic";

import Link from "next/link";

const statusCodes = [
  { code: "200", label: "OK", description: "Request succeeded. Response body contains the result." },
  { code: "202", label: "Accepted", description: "Request queued for async processing. Poll for result." },
  { code: "400", label: "Bad Request", description: "Invalid request body or missing required fields." },
  { code: "401", label: "Unauthorized", description: "Missing or invalid API key." },
  { code: "403", label: "Forbidden", description: "API key valid but lacks permission for this action." },
  { code: "404", label: "Not Found", description: "Resource ID does not exist in your tenant." },
  { code: "429", label: "Too Many Requests", description: "Rate limit exceeded. Retry after the Retry-After header value." },
  { code: "500", label: "Server Error", description: "Internal error. Retry with exponential backoff. Contact support if persistent." },
  { code: "502", label: "Bad Gateway", description: "Upstream extraction service temporarily unavailable. Retry in 30s." },
];

const rateLimits = [
  { plan: "Starter", limit: "60 req/min", burst: "10 req/sec" },
  { plan: "Growth", limit: "300 req/min", burst: "30 req/sec" },
  { plan: "Scale", limit: "1,000 req/min", burst: "100 req/sec" },
];

export default function ApiReferencePage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Developer
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          API Reference
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Integrate AvidiaTech into your own workflows, scripts, and applications using the REST API.
        </p>
      </div>

      {/* Auth */}
      <section className="space-y-4" id="authentication">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Authentication
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          All API requests require a Bearer token in the{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
            Authorization
          </code>{" "}
          header. Get your API key from{" "}
          <Link href="/dashboard/api" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Dashboard → API Keys
          </Link>
          .
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`Authorization: Bearer at_live_xK9mR2jQ4VnP8wBz3LsFhYcXd7tNgAeM`}
        </pre>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong>API keys are tenant-scoped</strong> — they can access all resources within
            your organization but no others.
          </li>
          <li>
            <strong>Rotate keys</strong> in Dashboard → API Keys if a key is compromised. Old
            keys are immediately invalidated on rotation.
          </li>
          <li>
            <strong>Test vs. live keys:</strong> Test keys (prefixed{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              at_test_
            </code>
            ) do not consume credits and return synthetic data. Use for development and CI.
          </li>
        </ul>
      </section>

      {/* Base URL */}
      <section className="space-y-3" id="base-url">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Base URL
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`https://app.avidiatech.com/api/v1`}
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          All endpoints are relative to this base URL. The API version is{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">v1</code>
          . Breaking changes will increment the version.
        </p>
      </section>

      {/* Rate limits */}
      <section className="space-y-4" id="rate-limits">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Rate Limits
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Sustained</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Burst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {rateLimits.map((r) => (
                <tr key={r.plan}>
                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{r.plan}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{r.limit}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{r.burst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Rate limit status is returned in response headers:{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-RateLimit-Limit</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-RateLimit-Remaining</code>, and{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-RateLimit-Reset</code> (Unix timestamp).
          On 429, use the{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Retry-After</code> header value (seconds).
        </p>
      </section>

      {/* Error format */}
      <section className="space-y-4" id="errors">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Error Format
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`// All errors use this shape:
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",   // optional
  "details": { ... }                 // optional, for validation errors
}

// Example: missing required field
HTTP 400 Bad Request
{
  "error": "Missing required field: url",
  "code": "MISSING_FIELD",
  "details": { "field": "url" }
}`}
        </pre>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Label</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {statusCodes.map((s) => (
                <tr key={s.code}>
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{s.code}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.label}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination */}
      <section className="space-y-4" id="pagination">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Pagination
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          List endpoints support{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">limit</code> (max 100, default 20) and{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">offset</code> (default 0) query parameters.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`GET /api/v1/ingest?limit=50&offset=100

// Response envelope
{
  "data": [ ... ],
  "total": 843,
  "limit": 50,
  "offset": 100
}`}
        </pre>
      </section>

      {/* ── ENDPOINTS ── */}

      {/* POST /ingest */}
      <section className="space-y-4" id="post-ingest">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          POST /ingest — Submit a Product URL
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Submits a product URL for extraction. Returns immediately with a queued status. Use the
          returned ID to poll for results or set up a webhook.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST /api/v1/ingest
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "url": "https://www.boschtools.com/us/en/boschtools-ocs/cordless-drill-GSB-18V-755.html",
  "options": {
    "reprocess": false,
    "pipeline": ["extract", "describe", "seo"]
  }
}

// 202 Accepted
{
  "id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "status": "queued",
  "created_at": "2024-03-15T14:22:00.000Z",
  "url": "https://www.boschtools.com/..."
}`}
        </pre>
        <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
          <p><strong>pipeline</strong> (optional) — array of modules to run after extraction. Default: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">["extract"]</code> only.</p>
          <p><strong>reprocess</strong> (optional, boolean) — if true, re-fetches the URL even if a cached result exists.</p>
        </div>
      </section>

      {/* GET /ingest/:id */}
      <section className="space-y-4" id="get-ingest">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          GET /ingest/:id — Get Extraction Result
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Retrieves the current status and data for an ingestion. Poll until{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">status</code> is{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">complete</code> or{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">failed</code>.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`GET /api/v1/ingest/ing_01HX4K2QZRP7W9VMBGT3DENF8
Authorization: Bearer <api-key>

// 200 OK
{
  "id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "status": "complete",
  "score": 87,
  "extracted_data": {
    "product_name": "Bosch GSB 18V-755 Cordless Combi Drill",
    "brand": "Bosch",
    "sku": "06019H3110",
    "specifications": {
      "max_torque": "75 Nm",
      "chuck_size": "13 mm",
      "speed_1": "0-550 rpm",
      "speed_2": "0-2100 rpm",
      "battery": "18V Li-ion"
    },
    "images": [
      "https://media.bosch-pt.com/media/A_37888.jpg"
    ],
    "availability": "in_stock",
    "price": "189.00"
  },
  "created_at": "2024-03-15T14:22:00.000Z",
  "completed_at": "2024-03-15T14:22:14.832Z"
}`}
        </pre>
      </section>

      {/* POST /describe */}
      <section className="space-y-4" id="post-describe">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          POST /describe — Generate Description
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST /api/v1/describe
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "tone": "professional",
  "format": "html",
  "length": "standard",
  "custom_instructions": "Highlight the BITURBO brushless motor."
}

// 200 OK
{
  "id": "desc_01HX5QRTAB2N3VMCGP4REEF9",
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "short": "Professional-grade brushless combi drill with 75 Nm torque, ideal for concrete and masonry on a single 18V charge.",
  "long": "<p>The Bosch GSB 18V-755 is engineered for professionals who need...</p>",
  "bullets": [
    "BITURBO brushless motor delivers 75 Nm hard torque",
    "2-speed gearbox: 0–550 rpm drilling / 0–2,100 rpm driving",
    "13mm keyless chuck for fast bit changes",
    "25+1 torque settings for precision screw driving",
    "Compatible with all Bosch 18V ProCORE batteries"
  ],
  "technical_summary": "GSB 18V-755 | Brushless EC | 75 Nm | 13mm chuck | 2-speed | 18V",
  "credits_used": 1
}`}
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tone options:{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">professional</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">casual</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">technical</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">medical</code>.{" "}
          Format options:{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">html</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">markdown</code>,{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">plain</code>.
        </p>
      </section>

      {/* POST /seo */}
      <section className="space-y-4" id="post-seo">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          POST /seo — Run SEO Optimization
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST /api/v1/seo
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "options": {
    "include_schema": true
  }
}

// 200 OK
{
  "id": "seo_01HX5MNQ2R4VP8XWBCJT5GAEF",
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "title": "18V Cordless Drill — Bosch GSB 18V-755 | Brushless Combi",
  "meta_description": "Shop the Bosch GSB 18V-755 cordless combi drill — 75 Nm brushless motor, 13mm chuck, 25+1 torque settings. Professional-grade power for concrete and wood.",
  "h1": "Bosch GSB 18V-755 Cordless Combi Drill (18V)",
  "schema": {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Bosch GSB 18V-755 Cordless Combi Drill",
    "brand": { "@type": "Brand", "name": "Bosch" },
    "sku": "06019H3110"
  },
  "score": 91,
  "recommendations": [],
  "credits_used": 1
}`}
        </pre>
      </section>

      {/* POST /bulk */}
      <section className="space-y-4" id="post-bulk">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          POST /bulk — Create Bulk Job
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Submit multiple URLs in a single request. The job runs asynchronously — poll{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
            GET /api/v1/bulk/:id
          </code>{" "}
          for progress.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`POST /api/v1/bulk
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "urls": [
    "https://www.3m.com/3M/en_US/p/d/v000057867/",
    "https://www.boschtools.com/us/en/.../GSB-18V-755.html",
    "https://www.medline.com/product/SensiCare-Gloves/Z05-PF18255"
  ],
  "pipeline": ["extract", "describe", "seo"]
}

// 202 Accepted
{
  "id": "bulk_01HX6PQRS3VP9YWCDJT6HAEG",
  "status": "processing",
  "total_items": 3,
  "created_at": "2024-03-15T15:00:00.000Z"
}`}
        </pre>
      </section>

      {/* GET /bulk/:id */}
      <section className="space-y-4" id="get-bulk">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          GET /bulk/:id — Get Bulk Job Status
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`GET /api/v1/bulk/bulk_01HX6PQRS3VP9YWCDJT6HAEG
Authorization: Bearer <api-key>

// 200 OK (in progress)
{
  "id": "bulk_01HX6PQRS3VP9YWCDJT6HAEG",
  "status": "processing",
  "total": 3,
  "processed": 2,
  "succeeded": 2,
  "failed": 0,
  "estimated_completion": "2024-03-15T15:02:30.000Z"
}

// 200 OK (complete)
{
  "id": "bulk_01HX6PQRS3VP9YWCDJT6HAEG",
  "status": "complete",
  "total": 3,
  "processed": 3,
  "succeeded": 3,
  "failed": 0,
  "ingestion_ids": [
    "ing_01HX4K2QZRP7W9VMBGT3DENF8",
    "ing_01HX4K9ZTAB2N3VMCGP4REEF9",
    "ing_01HX4KBMN4CD5WOPDHQ7SGFH2"
  ],
  "completed_at": "2024-03-15T15:02:18.441Z"
}`}
        </pre>
      </section>

      {/* Tips */}
      <section className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Integration Tips
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Use test API keys (
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">at_test_</code>
            ) in development and CI — they return synthetic data and consume no credits.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Use webhooks instead of polling for bulk jobs to avoid unnecessary API calls.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Include your{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">User-Agent</code>{" "}
            header when calling the API from a server so we can identify your integration in logs.
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-600 dark:text-cyan-400 shrink-0">→</span>
            Implement exponential backoff for 429 and 502 errors. Start with 1s, double per retry,
            cap at 60s.
          </li>
        </ul>
      </section>
    </div>
  );
}
