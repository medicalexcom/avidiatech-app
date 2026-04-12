export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsFeedsPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Commerce</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaFeeds — Product Feed Generation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Generate marketplace-ready product feeds for Google Shopping, Meta, Amazon, and custom formats.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Access Feeds from <Link href="/dashboard/feeds" className="underline">Dashboard → Feeds</Link>.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaFeeds generates live-updating product data feeds in formats required by major advertising and marketplace platforms: Google Merchant Center (XML/CSV), Meta Catalog (JSON), Amazon SP-API (TSTF), and custom CSV templates. Feeds are regenerated on a schedule and served via a CDN URL you point your platform at directly.</p>
      </section>
    </div>
  );
}
