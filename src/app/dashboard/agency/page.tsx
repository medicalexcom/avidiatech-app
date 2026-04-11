"use client";

import Link from "next/link";
import PageShell, { PageHeader } from "@/components/layout/PageShell";

const packages = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    iconBg: "bg-cyan-50 dark:bg-cyan-500/10",
    title: "Full catalog buildouts",
    description: "Send us your feeds, URLs, or SKU lists and we deliver a complete, normalized, and SEO-optimized catalog — ready for immediate import into your storefront or PIM.",
    badge: "Most popular",
    badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    title: "White-label backend",
    description: "Agencies can leverage our full platform under their own brand to service clients — complete with custom domains, branded exports, and reseller pricing.",
    badge: "For agencies",
    badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    title: "Flexible packages",
    description: "Choose from pre-defined bundles (500, 1,000, or 5,000+ SKUs) or request a fully custom quote tailored to your catalog complexity and turnaround requirements.",
    badge: "Scalable",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75M4.5 6h15" />
      </svg>
    ),
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    title: "High-margin service model",
    description: "Our agency model funds continued product development while delivering unmatched value to end customers — a win for merchants, agencies, and the platform.",
    badge: "Revenue share",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
];

const steps = [
  { num: "01", label: "Submit your feed", desc: "Share a product feed URL, file upload, or SKU list." },
  { num: "02", label: "We extract & normalize", desc: "Our pipeline ingests, cleans, and structures your data." },
  { num: "03", label: "AI enrichment", desc: "Descriptions, SEO titles, images, and specs are generated." },
  { num: "04", label: "QA & delivery", desc: "We validate, score, and deliver a catalog-ready export." },
];

export default function AgencyPage() {
  return (
    <PageShell glow="fuchsia">
      <PageHeader
        glow="fuchsia"
        kicker="AvidiaAgency"
        dot="bg-fuchsia-500"
        title={
          <>
            Done-for-you catalog{" "}
            <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
              buildouts at scale.
            </span>
          </>
        }
        description="Prefer to outsource your product catalog build? AvidiaAgency's experts will ingest, normalize, and optimize thousands of products on your behalf — freeing your team to focus on what matters."
        right={
          <a
            href="mailto:agency@avidiatech.com"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
          >
            Request a quote
          </a>
        }
      />

      {/* Package cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {packages.map((pkg) => (
          <div
            key={pkg.title}
            className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${pkg.iconBg}`}>
                  {pkg.icon}
                </div>
                <h2 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">{pkg.title}</h2>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pkg.badgeColor}`}>
                {pkg.badge}
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              {pkg.description}
            </p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          How it works
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative flex flex-col gap-2">
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-5 hidden h-px w-[calc(100%+1rem)] bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 lg:block" />
              )}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-50 text-[12px] font-bold text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
                {step.num}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{step.label}</p>
                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="rounded-2xl border border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 to-violet-50 p-6 dark:border-fuchsia-500/20 dark:from-fuchsia-500/8 dark:to-violet-500/8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
              Ready to delegate your catalog work?
            </h3>
            <p className="mt-1 text-[12.5px] text-slate-600 dark:text-slate-400">
              Get a custom quote within 24 hours. No commitment required.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/dashboard/import"
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Try it yourself
            </Link>
            <a
              href="mailto:agency@avidiatech.com"
              className="inline-flex h-8 items-center rounded-lg bg-fuchsia-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
            >
              Contact agency team →
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
