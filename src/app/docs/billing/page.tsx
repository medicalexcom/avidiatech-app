export const dynamic = "force-dynamic";
import Link from "next/link";
export default function DocsBillingPage() {
  const plans = [
    { name: "Starter", price: "$49/mo", ingests: "500", seo: "500", variants: "250", matching: "100" },
    { name: "Growth", price: "$149/mo", ingests: "5,000", seo: "5,000", variants: "2,500", matching: "1,000" },
    { name: "Pro", price: "$399/mo", ingests: "Unlimited", seo: "Unlimited", variants: "Unlimited", matching: "Unlimited" },
  ];
  return (
    <div className="max-w-prose space-y-10">
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">Account</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing & Plans</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your subscription, credits, and billing details.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                {["Plan","Price","Ingestions","SEO","Variants","Matching"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {plans.map(p => (
                <tr key={p.name}>
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.price}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.ingests}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.seo}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.variants}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.matching}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">All plans include a 14-day free trial. No credit card required to start. See <Link href="/dashboard/pricing" className="text-cyan-600 dark:text-cyan-400 hover:underline">full pricing page</Link> for current rates and annual discounts.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Managing Your Subscription</h2>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
          <li>Upgrade or downgrade at any time from <Link href="/dashboard/pricing" className="text-cyan-600 dark:text-cyan-400 hover:underline">Dashboard → Pricing</Link>. Proration is applied immediately.</li>
          <li>Download invoices and update payment methods from your billing portal.</li>
          <li>Cancel any time — your plan stays active until the end of the billing period.</li>
          <li>Monthly usage counters reset on your billing anniversary date.</li>
        </ul>
      </section>
    </div>
  );
}
