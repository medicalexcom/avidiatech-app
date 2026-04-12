export const dynamic = "force-dynamic";
export default function DocsMatchPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">Data Intelligence</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaMatch — Product Deduplication & Matching</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Identify duplicate listings and match products across suppliers, brands, and platforms.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Contact <a href="mailto:support@avidiatech.com" className="underline">support@avidiatech.com</a> for early access to AvidiaMatch.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaMatch uses embedding-based similarity search to identify products that represent the same real-world item across different supplier feeds, platforms, or internal catalogs. It flags duplicates for review and can automatically merge or link matching records.</p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Fuzzy product matching by title, description, MPN, and GTIN</li>
          <li>Cross-supplier duplicate detection</li>
          <li>Confidence scoring — high-confidence matches auto-merge, borderline ones queue for review</li>
          <li>Bulk review UI for approving or rejecting suggested matches</li>
        </ul>
      </section>
    </div>
  );
}
