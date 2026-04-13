export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsAuditPage() {
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Commerce</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AvidiaAudit — Catalog Quality Auditing</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Score and audit your product catalog for completeness, accuracy, and marketplace compliance.</p>
      </div>
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Access Audit from <Link href="/dashboard/audit" className="underline">Dashboard → Audit</Link>.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Overview</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">AvidiaAudit scores every product in your catalog across multiple quality dimensions: data completeness (missing descriptions, images, or attributes), SEO strength (title length, keyword density, meta coverage), content quality (reading level, specificity), and marketplace readiness (Amazon, Google Shopping requirements). Results surface as an actionable list sorted by improvement potential.</p>
      </section>
    </div>
  );
}
