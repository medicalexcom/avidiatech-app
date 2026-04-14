export const dynamic = "force-dynamic";
export default function DocsVariantsPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">Data Intelligence</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaVariants — Product Variant Detection</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Automatically identify and group product variants — sizes, colors, configurations — from unstructured listings.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Contact <a href="mailto:support@avidiatech.com" className="underline">support@avidiatech.com</a> to learn more.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaVariants detects when multiple product listings are actually variants of the same base product — different sizes of the same shirt, different colors of the same tool, different memory configurations of the same laptop. It groups these into parent-child relationships compatible with Shopify, BigCommerce, and WooCommerce variant models.</p>
      </section>
    </div>
  );
}
