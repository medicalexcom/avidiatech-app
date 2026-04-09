export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";

const sidebarSections = [
  {
    title: "Getting Started",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Quick Start", href: "/docs/getting-started" },
      { label: "First Extraction", href: "/docs/getting-started#first-extraction" },
    ],
  },
  {
    title: "AI Modules",
    links: [
      { label: "Extract", href: "/docs/extract" },
      { label: "Describe", href: "/docs/describe" },
      { label: "SEO", href: "/docs/seo" },
      { label: "Translate", href: "/docs/translate" },
      { label: "Cluster", href: "/docs/cluster" },
      { label: "Studio", href: "/docs/studio" },
    ],
  },
  {
    title: "Data Intelligence",
    links: [
      { label: "Match", href: "/docs/match" },
      { label: "Variants", href: "/docs/variants" },
      { label: "Specs", href: "/docs/specs" },
      { label: "Docs", href: "/docs/document-extraction" },
      { label: "Images", href: "/docs/images" },
    ],
  },
  {
    title: "Commerce",
    links: [
      { label: "Import", href: "/docs/import" },
      { label: "Audit", href: "/docs/audit" },
      { label: "Price", href: "/docs/price" },
      { label: "Feeds", href: "/docs/feeds" },
      { label: "Monitor", href: "/docs/monitor" },
    ],
  },
  {
    title: "Developer",
    links: [
      { label: "Browser Extension", href: "/docs/browser" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Webhooks", href: "/docs/webhooks" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Billing", href: "/docs/billing" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "Team Management", href: "/docs/team" },
    ],
  },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen overflow-y-auto flex flex-col">
        {/* Logo / brand link */}
        <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/docs"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            AvidiaTech Docs
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Product Data Automation
          </p>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-md px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="block text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-1"
          >
            ← Back to Dashboard
          </Link>
          <a
            href="mailto:support@avidiatech.com"
            className="block text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
