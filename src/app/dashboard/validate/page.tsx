"use client";

import Link from "next/link";
import PageShell, { PageHeader } from "@/components/layout/PageShell";

const checks = [
  {
    icon: "✦",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/25",
    title: "Schema validation",
    description: "Ensures required fields and attribute types are present and well-formed before any pipeline stage runs.",
  },
  {
    icon: "✦",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
    title: "Business rule checks",
    description: "Automated checks for pricing, dimensions, compatibility, and regulatory compliance (e.g. restricted goods).",
  },
  {
    icon: "✦",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25",
    title: "Anomaly detection",
    description: "Outlier flagging using statistical and ML models to catch suspicious values before they reach your storefront.",
  },
  {
    icon: "✦",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
    title: "Media validation",
    description: "Image and media checks including resolution, aspect ratio, file format, and watermark detection.",
  },
  {
    icon: "✦",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25",
    title: "Guided review workflows",
    description: "Manual review and override tools with version control and audit trails for every change.",
  },
  {
    icon: "✦",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
    title: "Real-time & batch API",
    description: "Real-time feedback and bulk batch validation to support integration with e-commerce platforms and PIM systems.",
  },
];

export default function ValidatePage() {
  return (
    <PageShell glow="emerald">
      {/* Header */}
      <PageHeader
        glow="emerald"
        kicker="AvidiaValidate"
        dot="bg-emerald-500"
        title={
          <>
            Validate your data before it{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
              reaches your customers.
            </span>
          </>
        }
        description="AvidiaValidate ensures your product data is accurate, complete, and compliant before publishing or downstream analysis — catching issues at the source."
        right={
          <div className="flex gap-2">
            <Link
              href="/dashboard/audit"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open Audit ↗
            </Link>
            <Link
              href="/dashboard/import"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Run validation
            </Link>
          </div>
        }
      />

      {/* Coming soon banner */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 dark:border-amber-500/25 dark:bg-amber-500/8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-amber-500 text-lg leading-none">⚠</span>
          <div>
            <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">Module coming soon</p>
            <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-400">
              AvidiaValidate is under active development. The checks below describe the planned feature set.
              In the meantime, use{" "}
              <Link href="/dashboard/audit" className="font-semibold underline underline-offset-2">AvidiaAudit</Link>
              {" "}for QA scoring on ingested products.
            </p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <div
            key={check.title}
            className={`rounded-2xl border p-5 ${check.bg}`}
          >
            <span className={`text-lg font-bold ${check.color}`}>{check.icon}</span>
            <h3 className="mt-2 text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">
              {check.title}
            </h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
              {check.description}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline position */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Where Validate fits in your pipeline
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          {["AvidiaExtract", "→", "AvidiaDescribe", "→", "AvidiaSEO", "→", "AvidiaValidate ✓", "→", "Publish"].map((step, i) => (
            <span
              key={i}
              className={
                step === "→"
                  ? "text-slate-300 dark:text-slate-700"
                  : step.includes("Validate")
                  ? "rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white"
                  : step === "Publish"
                  ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }
            >
              {step}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">
          Validation runs after enrichment and before any outbound feed or PIM sync. It acts as the final quality gate, blocking bad data from reaching customers.
        </p>
      </div>
    </PageShell>
  );
}
