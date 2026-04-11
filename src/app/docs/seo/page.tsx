export const dynamic = "force-dynamic";

import Link from "next/link";

const scoreBreakdown = [
  { factor: "Title tag length", weight: "20pts", detail: "50–60 characters is ideal. Shorter loses visibility; longer gets truncated in SERPs." },
  { factor: "Keyword in title", weight: "15pts", detail: "Primary keyword appears in the first half of the title tag." },
  { factor: "Meta description quality", weight: "20pts", detail: "150–160 chars, includes primary keyword, has a clear call to action." },
  { factor: "H1 presence", weight: "15pts", detail: "Unique H1 that differs from the title tag and uses the primary keyword." },
  { factor: "Description completeness", weight: "15pts", detail: "Long description covers features, benefits, and specifications." },
  { factor: "Schema markup", weight: "10pts", detail: "Valid Product schema with at least name, brand, offers, and availability." },
  { factor: "Readability", weight: "5pts", detail: "Flesch-Kincaid grade level appropriate for the product category." },
];

const commonIssues = [
  {
    issue: "Low SEO score (below 50)",
    causes: "Missing description, very short title, or no meta description generated.",
    fix: "Re-run AvidiaDescribe first, then run AvidiaSEO. The SEO module needs description content to score accurately.",
  },
  {
    issue: "Duplicate title tags",
    causes: "Multiple products with the same or very similar names producing identical titles.",
    fix: "Add differentiating attributes (SKU, size, color, variant) to your title template in Settings → SEO Templates.",
  },
  {
    issue: "Title truncated in SERPs",
    causes: "Title tag exceeds 60 characters. Google truncates at ~600px pixel width.",
    fix: "Edit the generated title in the product detail view. Click the title field, shorten to under 60 chars, and save.",
  },
  {
    issue: "Meta description not showing in Google",
    causes: "Google may rewrite meta descriptions if they don't match search intent. This is normal behavior.",
    fix: "Ensure the meta description is unique, includes the primary keyword naturally, and uses active language.",
  },
];

export default function SEOPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          AI Modules
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          AvidiaSEO — SEO Content Optimization
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Optimize every product listing for search visibility — title tags, meta descriptions, H1s,
          and structured data.
        </p>
      </div>

      {/* What it does */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          What AvidiaSEO Does
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaSEO analyzes the extracted product data and generated descriptions to produce
          search-optimized metadata for every product. It generates title tags, meta descriptions,
          H1 headings, and schema.org structured data markup — all grounded in the actual product
          content rather than generic templates.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every output is accompanied by a quality score (0–100) with specific recommendations for
          improvement. You can run AvidiaSEO on individual products, selected batches, or your
          entire catalog in one bulk job.
        </p>
      </section>

      {/* Scoring */}
      <section className="space-y-4" id="scoring">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          How SEO Scoring Works
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Each product receives an SEO score from 0 to 100 based on the following weighted factors:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Factor</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Weight</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {scoreBreakdown.map((row) => (
                <tr key={row.factor}>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.factor}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                      {row.weight}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-xs text-emerald-800 dark:text-emerald-300">
          <strong>Target:</strong> Aim for a score of 80+ before pushing products to your store.
          Products scoring below 60 are flagged in the SEO Audit dashboard for review.
        </div>
      </section>

      {/* Title tag */}
      <section className="space-y-4" id="title-tags">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Title Tag Optimization
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The title tag is the most important on-page SEO element. AvidiaSEO generates title tags
          that follow the format:
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`[Primary Keyword] — [Brand] [Model] | [Category Modifier]

Examples:
"N95 Respirator — 3M 8210 | Box of 20, NIOSH-Approved"
"18V Cordless Drill — Bosch GSB 18V-755 | Brushless Combi"
"Surgical Gloves — Medline SensiCare | Powder-Free, Size M"`}
        </pre>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            <strong>Character limit:</strong> AvidiaSEO targets 50–60 characters. The character
            counter in the SEO edit panel turns amber at 55 and red at 63.
          </p>
          <p>
            <strong>Keyword placement:</strong> the primary keyword appears as early in the title
            as possible. Google weights words earlier in the title more heavily.
          </p>
          <p>
            <strong>Brand inclusion:</strong> brand name is included after the primary keyword.
            If your store name is already in the site-level title template (e.g.,{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              | YourStore
            </code>
            ), AvidiaSEO excludes the brand from the product title to avoid duplication.
          </p>
        </div>
      </section>

      {/* Meta description */}
      <section className="space-y-4" id="meta-description">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Meta Description
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The meta description is the summary text that appears below your title in search results.
          While not a direct ranking factor, it significantly impacts click-through rate. AvidiaSEO
          generates meta descriptions that:
        </p>
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Stay within 150–160 characters (the sweet spot before Google truncates)
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Include the primary keyword naturally in the first 100 characters
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            End with a soft call to action ("Shop now", "Order today", "View full specs")
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 shrink-0">✓</span>
            Reference a key differentiating spec (e.g., "NIOSH-approved", "18V Li-ion",
            "powder-free")
          </li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Example:</strong>{" "}
          <em>
            "Buy the 3M N95 8210 Respirator — NIOSH-approved with ≥95% filtration. Box of 20,
            flat-fold design for all-day comfort. Ships same day."
          </em>
          {" "}(155 characters)
        </p>
      </section>

      {/* H1 vs title */}
      <section className="space-y-4" id="h1">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          H1 vs. Title Tag
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Your H1 (page heading) and title tag serve different purposes and should not be identical:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Title Tag</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Shown in browser tab and SERPs. Optimized for search engines and click-through.
              Concise, keyword-forward.
            </p>
            <p className="text-xs italic text-slate-500 dark:text-slate-400">
              "N95 Respirator — 3M 8210 | NIOSH-Approved, 20/Box"
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">H1 Heading</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Shown on the product page itself. Optimized for readability and conversion. Can be
              more descriptive and natural.
            </p>
            <p className="text-xs italic text-slate-500 dark:text-slate-400">
              "3M N95 Particulate Respirator 8210 (Box of 20)"
            </p>
          </div>
        </div>
      </section>

      {/* Schema markup */}
      <section className="space-y-4" id="schema">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Schema.org Structured Data
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaSEO generates valid JSON-LD markup for Product, Offer, and where available,
          AggregateRating schemas. This enables rich search results (star ratings, price, availability)
          in Google Shopping and organic SERPs.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "3M N95 Particulate Respirator 8210, 20/Box",
  "brand": { "@type": "Brand", "name": "3M" },
  "sku": "8210",
  "gtin": "00051131070141",
  "description": "NIOSH-approved N95 respirator with ≥95% filtration efficiency...",
  "image": ["https://cdn.3m.com/3M/en_US/p/d/v000057867/img/main.jpg"],
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "price": "24.99",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "Your Store" }
  }
}`}
        </pre>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The generated schema is available in the SEO panel under{" "}
          <strong>Structured Data</strong>. You can copy the JSON-LD block directly or use the
          Shopify/BigCommerce integration to inject it automatically.
        </p>
      </section>

      {/* Common issues */}
      <section className="space-y-4" id="common-issues">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Common SEO Issues and Fixes
        </h2>
        <div className="space-y-3">
          {commonIssues.map((item) => (
            <div key={item.issue} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.issue}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Causes:</strong> {item.causes}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Fix:</strong> {item.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SEO Audit */}
      <section className="space-y-4" id="audit">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          SEO Audit
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The SEO Audit at{" "}
          <Link href="/dashboard/audit" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            /dashboard/audit
          </Link>{" "}
          scans all products in your catalog and identifies:
        </p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Products with no SEO data (never run through AvidiaSEO)</li>
          <li>Products with scores below your configured threshold (default: 70)</li>
          <li>Duplicate title tags across products</li>
          <li>Missing or invalid schema markup</li>
          <li>Meta descriptions over 160 characters or under 100 characters</li>
          <li>Products with title tags identical to their H1</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          From the Audit view, you can select flagged products and re-run AvidiaSEO in bulk to
          resolve issues automatically.
        </p>
      </section>

      {/* Bulk SEO */}
      <section className="space-y-4" id="bulk-seo">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Bulk SEO Processing
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          To run AvidiaSEO across your entire catalog (or a filtered subset):
        </p>
        <ol className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>Go to Dashboard → Products and filter to the products you want to optimize.</li>
          <li>Select all (or a selection) using the checkboxes.</li>
          <li>Click <strong>Bulk Actions → Run SEO</strong>.</li>
          <li>Confirm the credit cost and start the job. Processing runs in the background.</li>
        </ol>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaSEO costs <strong>1 SEO credit per product per run</strong>. Running SEO on 500
          products costs 500 SEO credits.
        </p>
      </section>

      {/* API */}
      <section className="space-y-4" id="api">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          API: Run SEO Optimization
        </h2>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
{`// Run SEO on an existing ingestion
POST https://app.avidiatech.com/api/v1/seo
Authorization: Bearer <your-api-key>

{
  "ingestion_id": "ing_01HX4K2QZRP7W9VMBGT3DENF8",
  "options": {
    "include_schema": true,
    "category_keywords": ["N95", "respirator", "PPE", "NIOSH"]
  }
}

// Response
{
  "id": "seo_01HX5MNQR2VP8XWBCJT5GAEF1",
  "title": "N95 Respirator — 3M 8210 | NIOSH-Approved, 20/Box",
  "meta_description": "Buy the 3M N95 8210 Respirator — NIOSH-approved with ≥95% filtration. Box of 20, flat-fold design. Ships same day.",
  "h1": "3M N95 Particulate Respirator 8210 (Box of 20)",
  "schema": { "@context": "https://schema.org/", "@type": "Product", "..." },
  "score": 91,
  "recommendations": []
}

// Run SEO directly on ingestion
POST https://app.avidiatech.com/api/v1/ingest/ing_01HX4K2QZRP7W9VMBGT3DENF8/seo`}
        </pre>
      </section>

      {/* Integrations */}
      <section className="space-y-4" id="integrations">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Pushing SEO Data to Your Store
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Once SEO data is generated, push it to your platform:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong>Shopify:</strong> AvidiaTech writes the title tag to Shopify's{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              metafields_global_title_tag
            </code>{" "}
            and meta description to{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              metafields_global_description_tag
            </code>
            . Schema is injected via a theme snippet (setup instructions in the Shopify integration
            guide).
          </li>
          <li>
            <strong>BigCommerce:</strong> Title and meta description are written to the product's
            Page Title and Meta Description fields via the BigCommerce Management API.
          </li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          See the full{" "}
          <Link href="/docs/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Integrations guide
          </Link>{" "}
          for setup instructions.
        </p>
      </section>
    </div>
  );
}
