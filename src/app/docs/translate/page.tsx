export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsTranslatePage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300">AI Modules</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaTranslate — AI Product Translation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Translate product titles, descriptions, and SEO copy into any language at catalog scale.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">In the meantime, start a translation job from <Link href="/dashboard/translate" className="underline">Dashboard → Translate</Link>.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaTranslate takes your existing product content — titles, short descriptions, long descriptions, bullet features, and SEO metadata — and produces natural, market-ready translations using large language models fine-tuned for e-commerce copy. Each translation preserves product-specific terminology, units of measurement, and brand voice.</p>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Supports 50+ languages including RTL (Arabic, Hebrew)</li>
          <li>Preserves HTML formatting, bullet structure, and markdown</li>
          <li>Detects and keeps technical terms, SKUs, and model numbers untranslated</li>
          <li>Bulk jobs for entire catalogs — 10,000+ products overnight</li>
          <li>One-click push to Shopify, BigCommerce, or WooCommerce storefronts</li>
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Getting Started</h2>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>Go to <Link href="/dashboard/translate/new" className="text-cyan-600 dark:text-cyan-400 hover:underline">Dashboard → Translate → New Job</Link>.</li>
          <li>Select the target language and optionally name the job.</li>
          <li>Choose products to include (all products, by tag, or by collection).</li>
          <li>Review credit estimate and click <strong>Start Translation</strong>.</li>
          <li>Monitor progress from the Translate dashboard — results appear as each product completes.</li>
        </ol>
      </section>
    </div>
  );
}
