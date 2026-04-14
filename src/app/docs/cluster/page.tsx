export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsClusterPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300">AI Modules</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaCluster — Product Grouping & Categorization</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Automatically group products into meaningful clusters using AI — by category, attribute, or custom logic.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Contact <a href="mailto:support@avidiatech.com" className="underline">support@avidiatech.com</a> for early access.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaCluster analyzes your product catalog and groups items by shared attributes, product type, use case, or custom taxonomies. This enables smarter navigation, better merchandising, and accurate category assignment for large catalogs that would take weeks to categorize manually.</p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Unsupervised clustering by product similarity</li>
          <li>Custom taxonomy mapping to your existing category tree</li>
          <li>Attribute-based grouping (material, size range, price band, brand)</li>
          <li>Export cluster assignments as CSV or push to your platform</li>
        </ul>
      </section>
    </div>
  );
}
