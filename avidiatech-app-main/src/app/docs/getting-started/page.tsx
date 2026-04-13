export const dynamic = "force-dynamic";

import Link from "next/link";

const moduleTable = [
  {
    name: "AvidiaExtract",
    input: "Product URL or PDF",
    output: "Structured JSON (name, SKU, specs, images, price…)",
    useCase: "Pull raw product data from manufacturer pages",
  },
  {
    name: "AvidiaDescribe",
    input: "Extracted product data",
    output: "Short description, long description, bullet points",
    useCase: "Generate listing-ready copy for your store",
  },
  {
    name: "AvidiaSEO",
    input: "Product data + descriptions",
    output: "Title tag, meta description, H1, schema markup",
    useCase: "Optimize every listing for search visibility",
  },
  {
    name: "AvidiaTranslate",
    input: "Any text field",
    output: "Translated content in target language",
    useCase: "Localize product content for international stores",
  },
  {
    name: "AvidiaMatch",
    input: "Product identifiers (UPC, MPN, GTIN)",
    output: "Matched records from partner data sources",
    useCase: "Enrich products with additional specification data",
  },
  {
    name: "AvidiaMonitor",
    input: "Watched product URLs",
    output: "Change alerts (price, availability, specs)",
    useCase: "Track supplier and competitor pages automatically",
  },
];

const keyConcepts = [
  {
    term: "Tenant",
    definition:
      "Your organization's isolated workspace within AvidiaTech. All products, pipelines, and integrations belong to a single tenant. Team members share access within the tenant.",
  },
  {
    term: "Ingestion",
    definition:
      "The act of submitting a product URL or data payload to the platform. Each ingestion creates a record with a unique ID that you can reference across all modules.",
  },
  {
    term: "Pipeline Run",
    definition:
      "A coordinated sequence of module executions applied to one or more products. For example: Extract → Describe → SEO → Export to Shopify.",
  },
  {
    term: "Module Index",
    definition:
      "The versioned snapshot of a module's output for a given product. Each time you re-run a module, a new index entry is created so you can roll back.",
  },
  {
    term: "Export Type",
    definition:
      "How processed data leaves AvidiaTech: CSV download, direct push to Shopify/BigCommerce, webhook delivery, or API response.",
  },
];

export default function GettingStartedPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Getting Started
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Getting Started with AvidiaTech
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Go from zero to your first enriched product listing in under 10 minutes.
        </p>
      </div>

      {/* 1. What AvidiaTech does */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          1. What AvidiaTech Does
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaTech automates the product data pipeline that most eCommerce operators do manually:
          copy-pasting specs from supplier sites, writing descriptions, optimizing titles, and
          uploading everything to their store. The platform replaces that workflow with a structured,
          AI-driven pipeline you can run on a single product or your entire catalog.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The core pipeline looks like this:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {["Extract", "Describe", "SEO", "Translate", "Export"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-700 text-white">
                {step}
              </span>
              {i < arr.length - 1 && (
                <span className="text-slate-400">→</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Each stage is a discrete module — you can run only the stages you need. If you already
          have descriptions and just need SEO optimization, skip straight to AvidiaSEO. If you want
          the full pipeline on 5,000 products overnight, set up a bulk job and let it run.
        </p>
      </section>

      {/* 2. Creating your account */}
      <section className="space-y-4" id="account-setup">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Creating Your Account and Organization
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Sign up at{" "}
          <a href="https://app.avidiatech.com/sign-up" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            app.avidiatech.com/sign-up
          </a>
          . After email verification, you'll be prompted to create your organization (tenant). This
          is the workspace that contains all your products, pipeline runs, and integrations.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>Enter your organization name (e.g., "Acme Supply Co." or your store name).</li>
          <li>
            Select your primary industry — this helps AvidiaTech preload relevant templates and
            tone presets for your descriptions.
          </li>
          <li>
            Choose your plan. The <strong>Starter</strong> plan (free trial) includes 100 extractions
            and 50 description credits to get you going.
          </li>
          <li>
            You'll land on the dashboard. From here, you can start extracting immediately or set
            up an integration first (recommended if you have an existing store).
          </li>
        </ol>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If you're part of a team, invite colleagues via{" "}
          <Link href="/settings/organization" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Settings → Team
          </Link>
          . All team members share the same tenant, credits, and pipeline history.
        </p>
      </section>

      {/* 3. First extraction */}
      <section className="space-y-4" id="first-extraction">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Your First Extraction
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The fastest way to see the platform in action is to extract a single product. Here's
          exactly how to do it:
        </p>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>
              Navigate to{" "}
              <Link href="/dashboard/extract" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                Dashboard → Extract
              </Link>{" "}
              and click <strong>New Extraction</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Paste a manufacturer product URL. For example:{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                https://www.3m.com/3M/en_US/p/d/v000057867/
              </code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Hit <strong>Extract</strong>. The system fetches the page, parses it with AI, and
              normalizes the output into structured fields. This takes 5–30 seconds depending on
              page complexity.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span>
              Review the extracted data in the result panel. You'll see the product name, brand,
              SKU, specifications, images, and a quality score (0–100).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center">
              5
            </span>
            <span>
              Click <strong>Run Describe</strong> to generate a product description, or{" "}
              <strong>Run Full Pipeline</strong> to apply all modules at once.
            </span>
          </li>
        </ol>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-xs text-emerald-800 dark:text-emerald-300">
          <strong>Tip:</strong> Always use the manufacturer's own product page, not a retailer
          listing. Manufacturer pages have the most complete specification data and tend to score
          10–20 points higher in extraction quality.
        </div>
      </section>

      {/* 4. Module overview table */}
      <section className="space-y-4" id="modules">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Pipeline Modules Overview
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Each module in the pipeline is independent and can be run on its own or as part of a
          full run.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Module</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Input</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Output</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Use Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {moduleTable.map((row) => (
                <tr key={row.name} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.input}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.output}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.useCase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. First integration */}
      <section className="space-y-4" id="first-integration">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Setting Up Your First Integration
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Integrations let AvidiaTech push processed product data directly to your eCommerce
          platform. Here's how to connect Shopify:
        </p>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>
            Go to{" "}
            <Link href="/dashboard/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Dashboard → Integrations
            </Link>{" "}
            and click <strong>Add Integration → Shopify</strong>.
          </li>
          <li>
            In your Shopify admin, navigate to <strong>Apps → App and sales channel settings →
            Develop apps</strong>. Create a new custom app.
          </li>
          <li>
            Under <strong>Admin API access scopes</strong>, enable:{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              read_products
            </code>
            {" "}and{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              write_products
            </code>.
          </li>
          <li>Install the app and copy the <strong>Admin API access token</strong>.</li>
          <li>Paste your store URL and API token into the AvidiaTech integration form and click <strong>Test Connection</strong>.</li>
          <li>Once connected, configure your field mappings (which AvidiaTech fields push to which Shopify fields).</li>
        </ol>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          For BigCommerce, WooCommerce, and other platforms, see the full{" "}
          <Link href="/docs/integrations" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Integrations guide
          </Link>
          .
        </p>
      </section>

      {/* 6. Bulk job */}
      <section className="space-y-4" id="bulk-processing">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Running Your First Bulk Job
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Once you've verified that extraction and description quality meets your standards on a
          few sample products, you're ready to scale. Bulk jobs let you process hundreds or
          thousands of products in one go.
        </p>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>
            Prepare a CSV with at minimum a <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">url</code> column. Optionally include <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">sku</code> and <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">name</code>.
          </li>
          <li>
            Go to{" "}
            <Link href="/imports/new" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Dashboard → Import
            </Link>{" "}
            and upload your CSV.
          </li>
          <li>Map your columns to AvidiaTech fields in the mapping UI.</li>
          <li>
            Select which pipeline stages to run: Extract, Describe, SEO — or all three.
          </li>
          <li>
            Click <strong>Start Bulk Job</strong>. You'll receive an email when processing is
            complete and can monitor progress in real time from the Bulk Jobs tab.
          </li>
        </ol>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> Bulk jobs consume credits based on the number of products and
          modules selected. Check your available credits in{" "}
          <Link href="/dashboard/pricing" className="underline">
            Billing
          </Link>{" "}
          before starting a large run.
        </div>
      </section>

      {/* 7. Key concepts */}
      <section className="space-y-4" id="concepts">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          7. Key Concepts
        </h2>
        <dl className="space-y-4">
          {keyConcepts.map((c) => (
            <div key={c.term} className="border-l-2 border-cyan-300 dark:border-cyan-700 pl-4">
              <dt className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.term}</dt>
              <dd className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{c.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 8. Getting help */}
      <section className="space-y-4" id="help">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          8. Getting Help
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          If you run into issues or have questions that aren't covered here:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong>In-app support chat:</strong> click the chat bubble in the bottom-right corner
            of any page. A real person responds during business hours (Mon–Fri, 9am–6pm ET).
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@avidiatech.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              support@avidiatech.com
            </a>{" "}
            — include your tenant name and ingestion ID for fastest resolution.
          </li>
          <li>
            <strong>Documentation:</strong> use the sidebar to browse all module guides, or the
            search bar at the top to find specific topics.
          </li>
        </ul>
      </section>
    </div>
  );
}
