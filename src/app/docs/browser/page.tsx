export const dynamic = "force-dynamic";

import Link from "next/link";

export default function BrowserExtensionPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Integrations
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Browser Extension
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Extract product data directly from any supplier or competitor website with one click.
        </p>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-2">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          The Browser Extension docs are being prepared. In the meantime, you can install the
          extension from the Chrome Web Store and follow the in-app onboarding, or{" "}
          <a href="mailto:support@avidiatech.com" className="underline hover:no-underline">
            contact support
          </a>{" "}
          for help getting started.
        </p>
      </div>

      {/* Overview */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Overview
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The AvidiaTech Browser Extension lets you extract product data from any page in your browser
          and send it directly to your AvidiaTech catalog — without leaving the supplier's website.
          It works on any public product page: distributors, marketplaces, competitor stores, or
          manufacturer pages.
        </p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>One-click extraction from any product page</li>
          <li>Automatically detects images, title, description, price, and specs</li>
          <li>Sends data directly to your AvidiaTech workspace</li>
          <li>Supports bulk extraction across paginated product listings</li>
          <li>Works alongside Shopify, BigCommerce, and WooCommerce connectors</li>
        </ul>
      </section>

      {/* How to install */}
      <section className="space-y-4" id="install">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Installation
        </h2>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>Visit the Chrome Web Store and search for "AvidiaTech Product Extractor".</li>
          <li>Click <strong>Add to Chrome</strong> and accept the required permissions.</li>
          <li>Click the AvidiaTech icon in your browser toolbar and sign in with your account.</li>
          <li>Navigate to any product page and click <strong>Extract</strong> to capture product data.</li>
        </ol>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-xs text-slate-500 dark:text-slate-400">
          The extension requires an active AvidiaTech subscription. Extracted products count against
          your monthly ingestion quota. See{" "}
          <Link href="/dashboard/pricing" className="underline hover:no-underline text-cyan-600 dark:text-cyan-400">
            plan limits
          </Link>{" "}
          for details.
        </div>
      </section>

      {/* Next steps */}
      <section className="space-y-3" id="next-steps">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Next Steps
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Getting started guide →
          </Link>
          <Link
            href="/docs/import"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            CSV import →
          </Link>
          <Link
            href="/docs/webhooks"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Webhooks →
          </Link>
        </div>
      </section>
    </div>
  );
}
