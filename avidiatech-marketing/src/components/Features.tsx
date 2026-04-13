import {
  Globe2,
  Languages,
  Activity,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  Layers,
} from 'lucide-react'

const features = [
  {
    icon: Layers,
    title: 'Multi-tenant & team-ready',
    desc: 'Organization-level isolation via Clerk. Every tenant\'s data is fully separated with Supabase Row-Level Security.',
    tag: 'Infrastructure',
    tagColor: 'bg-cyan-50 text-cyan-700',
  },
  {
    icon: Languages,
    title: 'AvidiaTranslate',
    desc: 'Generate multilingual product descriptions in 50+ languages — same pipeline, instant localization.',
    tag: 'Live',
    tagColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Activity,
    title: 'AvidiaMonitor',
    desc: 'Automatically detect when manufacturer URLs change and re-trigger the Extract → SEO pipeline.',
    tag: 'Live',
    tagColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: BarChart3,
    title: 'AvidiaAudit',
    desc: 'Score every product page for SEO compliance and completeness. Get actionable improvement suggestions.',
    tag: 'Live',
    tagColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: FileSpreadsheet,
    title: 'AvidiaFeeds',
    desc: 'Ingest product data from CSV, Excel, or manufacturer APIs — not just URLs. Bulk-process entire catalogs.',
    tag: 'Pro',
    tagColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Globe2,
    title: 'eCommerce integrations',
    desc: 'Export directly to Shopify, BigCommerce, WooCommerce, Webflow, and custom JSON. Platform-native field mapping.',
    tag: 'All plans',
    tagColor: 'bg-cyan-50 text-cyan-700',
  },
  {
    icon: ShieldCheck,
    title: 'Auto-heal compliance',
    desc: 'Every SEO output passes through strict enforcement rules — character limits, deduplication, required sections.',
    tag: 'AvidiaSEO',
    tagColor: 'bg-pink-50 text-pink-700',
  },
  {
    icon: Users,
    title: 'White-label & agency mode',
    desc: 'Run AvidiaTech under your own brand. Manage multiple client tenants from a single agency dashboard.',
    tag: 'Enterprise',
    tagColor: 'bg-slate-100 text-slate-700',
  },
]

export default function Features() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            Platform Features
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-text leading-tight mb-4">
            Everything you need to scale product data.
          </h2>
          <p className="text-brand-muted text-lg">
            Built for teams that need speed, accuracy, and compliance at catalog scale.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-primarySoft flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.tagColor}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-brand-text mb-2">{f.title}</h3>
                <p className="text-brand-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
