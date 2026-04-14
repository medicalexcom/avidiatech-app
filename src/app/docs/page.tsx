export const dynamic = "force-dynamic";

import Link from "next/link";

const quickNavCards = [
  {
    title: "Getting Started",
    description: "Set up your account and run your first extraction in minutes.",
    href: "/docs/getting-started",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "AvidiaExtract",
    description: "Extract structured product data from any manufacturer URL.",
    href: "/docs/extract",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    title: "AvidiaDescribe",
    description: "Generate human-quality product descriptions with AI.",
    href: "/docs/describe",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    title: "AvidiaSEO",
    description: "Optimize title tags, meta descriptions, and structured data.",
    href: "/docs/seo",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Import & CSV",
    description: "Bulk-import products from CSV, Shopify exports, or BigCommerce.",
    href: "/docs/import",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "API Reference",
    description: "Integrate AvidiaTech into your own workflows and pipelines.",
    href: "/docs/api",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

const popularGuides = [
  { label: "How to extract your first product", href: "/docs/getting-started#first-extraction" },
  { label: "Setting up Shopify integration", href: "/docs/integrations#shopify" },
  { label: "Bulk processing 1,000 products", href: "/docs/import#bulk-processing" },
  { label: "Improving SEO scores", href: "/docs/seo#improving-scores" },
];

export default function DocsHomePage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          AvidiaTech Documentation
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Everything you need to automate your product data.
        </p>
      </div>

      {/* Welcome */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Welcome to AvidiaTech
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaTech is an AI-powered product data platform that extracts, enriches, and distributes
          structured product information from manufacturer and supplier sources — so you can list
          products faster, with better content and less manual work. The platform handles the full
          pipeline: fetching raw data from URLs or PDFs, running it through AI modules for
          descriptions and SEO, then pushing clean, formatted content directly to your eCommerce
          store.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Whether you manage 50 products or 500,000, AvidiaTech is designed to scale with your
          catalog — processing in bulk, syncing to Shopify or BigCommerce automatically, and
          flagging data quality issues before they reach your storefront.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Use these docs to understand each module, set up your integrations, and get the most out
          of the platform. If you get stuck, support chat is available in the bottom-right corner
          of the app.
        </p>
      </section>

      {/* Quick navigation grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-sm transition-all"
            >
              <div className="text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 transition-colors">
                {card.icon}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {card.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular guides */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Most Popular Guides
        </h2>
        <ul className="space-y-2">
          {popularGuides.map((guide) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
              >
                <span className="text-slate-300 dark:text-slate-600 group-hover:text-cyan-400 transition-colors">→</span>
                {guide.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Support */}
      <section className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Need help?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Our support team is available Monday–Friday, 9am–6pm ET. Average response time: under 2 hours.
          </p>
        </div>
        <a
          href="mailto:support@avidiatech.com"
          className="shrink-0 inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Contact Support
        </a>
      </section>
    </div>
  );
}
