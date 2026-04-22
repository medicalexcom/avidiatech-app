module.exports=[116882,a=>{"use strict";var b=a.i(907997),c=a.i(395936);let d=[{code:"200",label:"OK",description:"Request succeeded. Response body contains the result."},{code:"202",label:"Accepted",description:"Request queued for async processing. Poll for result."},{code:"400",label:"Bad Request",description:"Invalid request body or missing required fields."},{code:"401",label:"Unauthorized",description:"Missing or invalid API key."},{code:"403",label:"Forbidden",description:"API key valid but lacks permission for this action."},{code:"404",label:"Not Found",description:"Resource ID does not exist in your tenant."},{code:"429",label:"Too Many Requests",description:"Rate limit exceeded. Retry after the Retry-After header value."},{code:"500",label:"Server Error",description:"Internal error. Retry with exponential backoff. Contact support if persistent."},{code:"502",label:"Bad Gateway",description:"Upstream extraction service temporarily unavailable. Retry in 30s."}],e=[{plan:"Starter",limit:"60 req/min",burst:"10 req/sec"},{plan:"Growth",limit:"300 req/min",burst:"30 req/sec"},{plan:"Scale",limit:"1,000 req/min",burst:"100 req/sec"}];function f(){return(0,b.jsxs)("div",{className:"max-w-prose space-y-10",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)("span",{className:"inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",children:"Developer"}),(0,b.jsx)("h1",{className:"text-2xl font-bold text-slate-900 dark:text-slate-100",children:"API Reference"}),(0,b.jsx)("p",{className:"text-sm text-slate-500 dark:text-slate-400",children:"Integrate AvidiaTech into your own workflows, scripts, and applications using the REST API."})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"authentication",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"Authentication"}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:["All API requests require a Bearer token in the"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"Authorization"})," ","header. Get your API key from"," ",(0,b.jsx)(c.default,{href:"/dashboard/api",className:"text-cyan-600 dark:text-cyan-400 hover:underline",children:"Dashboard → API Keys"}),"."]}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:"Authorization: Bearer at_live_xK9mR2jQ4VnP8wBz3LsFhYcXd7tNgAeM"}),(0,b.jsxs)("ul",{className:"space-y-2 text-sm text-slate-600 dark:text-slate-300",children:[(0,b.jsxs)("li",{children:[(0,b.jsx)("strong",{children:"API keys are tenant-scoped"})," — they can access all resources within your organization but no others."]}),(0,b.jsxs)("li",{children:[(0,b.jsx)("strong",{children:"Rotate keys"})," in Dashboard → API Keys if a key is compromised. Old keys are immediately invalidated on rotation."]}),(0,b.jsxs)("li",{children:[(0,b.jsx)("strong",{children:"Test vs. live keys:"})," Test keys (prefixed"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"at_test_"}),") do not consume credits and return synthetic data. Use for development and CI."]})]})]}),(0,b.jsxs)("section",{className:"space-y-3",id:"base-url",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"Base URL"}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:"https://app.avidiatech.com/api/v1"}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300",children:["All endpoints are relative to this base URL. The API version is"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"v1"}),". Breaking changes will increment the version."]})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"rate-limits",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"Rate Limits"}),(0,b.jsx)("div",{className:"overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800",children:(0,b.jsxs)("table",{className:"w-full text-xs",children:[(0,b.jsx)("thead",{children:(0,b.jsxs)("tr",{className:"bg-slate-100 dark:bg-slate-800 text-left",children:[(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Plan"}),(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Sustained"}),(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Burst"})]})}),(0,b.jsx)("tbody",{className:"divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900",children:e.map(a=>(0,b.jsxs)("tr",{children:[(0,b.jsx)("td",{className:"px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100",children:a.plan}),(0,b.jsx)("td",{className:"px-4 py-2.5 text-slate-600 dark:text-slate-400",children:a.limit}),(0,b.jsx)("td",{className:"px-4 py-2.5 text-slate-600 dark:text-slate-400",children:a.burst})]},a.plan))})]})}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:["Rate limit status is returned in response headers:"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"X-RateLimit-Limit"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"X-RateLimit-Remaining"}),", and"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"X-RateLimit-Reset"})," (Unix timestamp). On 429, use the"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"Retry-After"})," header value (seconds)."]})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"errors",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"Error Format"}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`// All errors use this shape:
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
}`}),(0,b.jsx)("div",{className:"overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800",children:(0,b.jsxs)("table",{className:"w-full text-xs",children:[(0,b.jsx)("thead",{children:(0,b.jsxs)("tr",{className:"bg-slate-100 dark:bg-slate-800 text-left",children:[(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Status"}),(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Label"}),(0,b.jsx)("th",{className:"px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300",children:"Meaning"})]})}),(0,b.jsx)("tbody",{className:"divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900",children:d.map(a=>(0,b.jsxs)("tr",{children:[(0,b.jsx)("td",{className:"px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100",children:a.code}),(0,b.jsx)("td",{className:"px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap",children:a.label}),(0,b.jsx)("td",{className:"px-4 py-2.5 text-slate-600 dark:text-slate-400",children:a.description})]},a.code))})]})})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"pagination",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"Pagination"}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:["List endpoints support"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"limit"})," (max 100, default 20) and"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"offset"})," (default 0) query parameters."]}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`GET /api/v1/ingest?limit=50&offset=100

// Response envelope
{
  "data": [ ... ],
  "total": 843,
  "limit": 50,
  "offset": 100
}`})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"post-ingest",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"POST /ingest — Submit a Product URL"}),(0,b.jsx)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:"Submits a product URL for extraction. Returns immediately with a queued status. Use the returned ID to poll for results or set up a webhook."}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`POST /api/v1/ingest
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
}`}),(0,b.jsxs)("div",{className:"text-xs space-y-1 text-slate-600 dark:text-slate-400",children:[(0,b.jsxs)("p",{children:[(0,b.jsx)("strong",{children:"pipeline"})," (optional) — array of modules to run after extraction. Default: ",(0,b.jsx)("code",{className:"bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:'["extract"]'})," only."]}),(0,b.jsxs)("p",{children:[(0,b.jsx)("strong",{children:"reprocess"})," (optional, boolean) — if true, re-fetches the URL even if a cached result exists."]})]})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"get-ingest",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"GET /ingest/:id — Get Extraction Result"}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:["Retrieves the current status and data for an ingestion. Poll until"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"status"})," is"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"complete"})," or"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"failed"}),"."]}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`GET /api/v1/ingest/ing_01HX4K2QZRP7W9VMBGT3DENF8
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
}`})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"post-describe",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"POST /describe — Generate Description"}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`POST /api/v1/describe
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
}`}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300",children:["Tone options:"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"professional"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"casual"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"technical"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"medical"}),"."," ","Format options:"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"html"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"markdown"}),","," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"plain"}),"."]})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"post-seo",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"POST /seo — Run SEO Optimization"}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`POST /api/v1/seo
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
}`})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"post-bulk",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"POST /bulk — Create Bulk Job"}),(0,b.jsxs)("p",{className:"text-sm text-slate-600 dark:text-slate-300 leading-relaxed",children:["Submit multiple URLs in a single request. The job runs asynchronously — poll"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"GET /api/v1/bulk/:id"})," ","for progress."]}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`POST /api/v1/bulk
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
}`})]}),(0,b.jsxs)("section",{className:"space-y-4",id:"get-bulk",children:[(0,b.jsx)("h2",{className:"text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2",children:"GET /bulk/:id — Get Bulk Job Status"}),(0,b.jsx)("pre",{className:"bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto",children:`GET /api/v1/bulk/bulk_01HX6PQRS3VP9YWCDJT6HAEG
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
}`})]}),(0,b.jsxs)("section",{className:"bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3",children:[(0,b.jsx)("h3",{className:"text-base font-semibold text-slate-900 dark:text-slate-100",children:"Integration Tips"}),(0,b.jsxs)("ul",{className:"space-y-2 text-sm text-slate-600 dark:text-slate-300",children:[(0,b.jsxs)("li",{className:"flex gap-2",children:[(0,b.jsx)("span",{className:"text-cyan-600 dark:text-cyan-400 shrink-0",children:"→"}),"Use test API keys (",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"at_test_"}),") in development and CI — they return synthetic data and consume no credits."]}),(0,b.jsxs)("li",{className:"flex gap-2",children:[(0,b.jsx)("span",{className:"text-cyan-600 dark:text-cyan-400 shrink-0",children:"→"}),"Use webhooks instead of polling for bulk jobs to avoid unnecessary API calls."]}),(0,b.jsxs)("li",{className:"flex gap-2",children:[(0,b.jsx)("span",{className:"text-cyan-600 dark:text-cyan-400 shrink-0",children:"→"}),"Include your"," ",(0,b.jsx)("code",{className:"text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded",children:"User-Agent"})," ","header when calling the API from a server so we can identify your integration in logs."]}),(0,b.jsxs)("li",{className:"flex gap-2",children:[(0,b.jsx)("span",{className:"text-cyan-600 dark:text-cyan-400 shrink-0",children:"→"}),"Implement exponential backoff for 429 and 502 errors. Start with 1s, double per retry, cap at 60s."]})]})]})]})}a.s(["default",()=>f,"dynamic",0,"force-dynamic"])}];

//# sourceMappingURL=src_app_docs_api_page_tsx_9c0250dc._.js.map