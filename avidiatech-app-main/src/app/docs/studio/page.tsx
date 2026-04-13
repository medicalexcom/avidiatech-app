export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsStudioPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300">AI Modules</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaStudio — AI Content Editor</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Review, edit, and approve AI-generated product content in a structured editorial interface.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Access the Studio from <Link href="/dashboard/studio" className="underline">Dashboard → Studio</Link>.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaStudio is an inline content review tool. After AI modules generate descriptions, SEO titles, and translations, your team reviews and approves content before it publishes to your storefront. Studio supports multi-user workflows with role-based approvals, inline comments, and version history.</p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Side-by-side original vs. AI-generated content comparison</li>
          <li>Inline editing with tracked changes</li>
          <li>Approve, reject, or request revision per field</li>
          <li>Multi-language review in a single interface</li>
          <li>One-click publish to connected storefronts</li>
        </ul>
      </section>
    </div>
  );
}
