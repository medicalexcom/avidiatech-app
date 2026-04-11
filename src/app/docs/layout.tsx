export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";

/* ─── Sidebar navigation ──────────────────────────────────────────────────── */
const sidebarSections: {
  title: string;
  accent: string;        // tailwind text color for section dot
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Getting Started",
    accent: "bg-cyan-500",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Quick Start", href: "/docs/getting-started" },
      { label: "First Extraction", href: "/docs/getting-started#first-extraction" },
    ],
  },
  {
    title: "AI Modules",
    accent: "bg-fuchsia-500",
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
    accent: "bg-violet-500",
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
    accent: "bg-emerald-500",
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
    accent: "bg-sky-500",
    links: [
      { label: "Browser Extension", href: "/docs/browser" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Webhooks", href: "/docs/webhooks" },
    ],
  },
  {
    title: "Account",
    accent: "bg-indigo-500",
    links: [
      { label: "Billing", href: "/docs/billing" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "Team Management", href: "/docs/team" },
    ],
  },
];

/* ─── Layout ──────────────────────────────────────────────────────────────── */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark flex min-h-screen bg-slate-950 text-slate-50">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="relative w-64 shrink-0 flex flex-col border-r border-slate-800/60 bg-slate-900/90 sticky top-0 h-screen overflow-hidden">

        {/* Sidebar ambient glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-12 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.6) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Top gradient stripe */}
        <div
          className="h-[2px] w-full shrink-0"
          style={{ background: "linear-gradient(90deg,#06b6d4 0%,#a855f7 50%,#6366f1 100%)" }}
        />

        {/* Brand header */}
        <div className="relative px-5 py-5 border-b border-slate-800/50">
          <Link
            href="/docs"
            className="flex items-center gap-2 group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-violet-600 shadow-md shadow-cyan-900/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                AvidiaTech Docs
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">Product Data Automation</p>
            </div>
          </Link>
        </div>

        {/* Nav sections */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-1.5 px-2 mb-2">
                <div className={`h-1.5 w-1.5 rounded-full ${section.accent}`} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {section.title}
                </p>
              </div>
              <ul className="space-y-0.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-all duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="relative px-4 py-4 border-t border-slate-800/50 bg-slate-900/60">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors mb-2"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
            </svg>
            Back to Dashboard
          </Link>
          <a
            href="mailto:support@avidiatech.com"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 4l6 5 6-5M2 4h12v9H2z" />
            </svg>
            Contact Support
          </a>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 overflow-y-auto">

        {/* Main area ambient glow */}
        <div className="pointer-events-none fixed inset-0 left-64 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-cyan-600/8 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <main className="relative max-w-4xl mx-auto px-8 py-12">
          {/* Docs prose wrapper */}
          <div className="prose prose-invert prose-slate max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h1:text-3xl prose-h1:text-slate-50
            prose-h2:text-xl prose-h2:text-slate-100 prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-base prose-h3:text-slate-200
            prose-p:text-slate-400 prose-p:leading-relaxed
            prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300
            prose-strong:text-slate-200
            prose-code:text-cyan-300 prose-code:bg-slate-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
            prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl
            prose-table:text-sm
            prose-th:text-slate-300 prose-th:font-semibold
            prose-td:text-slate-400
            prose-li:text-slate-400
            prose-hr:border-slate-800">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
