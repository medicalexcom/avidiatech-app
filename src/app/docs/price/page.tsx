export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsPricePage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Commerce</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaPrice — Competitive Pricing Intelligence</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Monitor competitor prices and apply automated repricing rules across your catalog.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Access Pricing from <Link href="/dashboard/price" className="underline">Dashboard → Price</Link>.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaPrice tracks competitor prices for your products across marketplaces and direct competitors' websites. You define pricing rules (match lowest, stay 5% below, maintain minimum margin) and AvidiaPrice applies them automatically — either as suggestions for approval or via direct API push to your storefront.</p>
      </section>
    </div>
  );
}
