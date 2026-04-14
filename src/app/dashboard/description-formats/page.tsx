'use client';

import PageShell, { PageHeader } from "@/components/layout/PageShell";

const formats = [
  {
    name: "Avidia Standard",
    slug: "avidia-standard",
    description: "Optimized for search and readability across all channels. Balances keyword density, scannability, and brand tone — the recommended default for most product types.",
    best: "All-channel",
    color: "cyan",
    accentBg: "bg-cyan-50 dark:bg-cyan-500/10",
    accentBorder: "border-cyan-200 dark:border-cyan-500/30",
    accentText: "text-cyan-700 dark:text-cyan-300",
    recommended: true,
  },
  {
    name: "General E-commerce",
    slug: "general",
    description: "A concise, neutral tone that fits most marketplaces — Amazon, eBay, Google Shopping. Focuses on specifications, features, and benefits in a structured format.",
    best: "Marketplaces",
    color: "slate",
    accentBg: "bg-slate-100 dark:bg-slate-800",
    accentBorder: "border-slate-200 dark:border-slate-700",
    accentText: "text-slate-600 dark:text-slate-300",
    recommended: false,
  },
  {
    name: "Shopify Conversion",
    slug: "shopify",
    description: "Conversion-focused copy for Shopify stores. Uses persuasive language, benefit-driven bullet points, and emotional triggers to drive add-to-cart intent.",
    best: "Shopify",
    color: "emerald",
    accentBg: "bg-emerald-50 dark:bg-emerald-500/10",
    accentBorder: "border-emerald-200 dark:border-emerald-500/30",
    accentText: "text-emerald-700 dark:text-emerald-300",
    recommended: false,
  },
  {
    name: "Manufacturer Rep",
    slug: "manufacturer",
    description: "Replicates the manufacturer's official style guidelines. Ideal for distributors and resellers who need to maintain brand compliance across catalog exports.",
    best: "B2B / Wholesale",
    color: "violet",
    accentBg: "bg-violet-50 dark:bg-violet-500/10",
    accentBorder: "border-violet-200 dark:border-violet-500/30",
    accentText: "text-violet-700 dark:text-violet-300",
    recommended: false,
  },
];

export default function DescriptionFormatsPage() {
  return (
    <PageShell glow="violet">
      <PageHeader
        glow="violet"
        kicker="Description Formats"
        dot="bg-violet-500"
        title="Custom description styles"
        description="Select from multiple description formats to generate product copy tailored to your marketplace or brand voice. Each format is tuned for a specific channel and conversion goal."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {formats.map((fmt) => (
          <div
            key={fmt.slug}
            className={`relative rounded-2xl border p-5 ${fmt.accentBorder} ${fmt.accentBg} shadow-card`}
          >
            {fmt.recommended && (
              <div className="absolute -top-3 left-4">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold shadow-sm ${fmt.accentBg} ${fmt.accentText} ${fmt.accentBorder}`}>
                  Recommended
                </span>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">{fmt.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${fmt.accentBg} ${fmt.accentText}`}>
                {fmt.best}
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">{fmt.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-[12.5px] text-slate-600 dark:text-slate-400">
          Description formats are selected when configuring an AvidiaDescribe run. Navigate to{" "}
          <a href="/dashboard/describe" className="font-semibold text-violet-600 dark:text-violet-400 underline underline-offset-2">
            AvidiaDescribe
          </a>{" "}
          to choose a format and generate AI-powered product copy for your catalog.
        </p>
      </div>
    </PageShell>
  );
}
