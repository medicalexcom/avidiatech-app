import { Database, Wand2, Trophy, Download, ArrowRight } from 'lucide-react'

const modules = [
  {
    icon: Database,
    name: 'AvidiaExtract',
    tagline: 'Scrape. Structure. Normalize.',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    description:
      'Fetches any product URL and produces a clean, structured JSON payload — specs, manuals, variants, images, and source SEO data. No GPT. Pure structured data.',
    bullets: [
      'Full specs normalization into key:value pairs',
      'Variant detection and SKU structuring',
      'Manual & PDF extraction with labels',
      'Source SEO capture (H1, title, meta, OG tags)',
    ],
  },
  {
    icon: Wand2,
    name: 'AvidiaDescribe',
    tagline: 'Generate from anything.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    description:
      'A flexible GPT-powered description engine that accepts any input — short manufacturer text, extracted data, or raw snippets — and produces full SEO-ready product descriptions.',
    bullets: [
      'Works from a URL, text, or structured data',
      'Generates H1, title, meta, and description HTML',
      'Tone control: neutral, professional, clinical',
      'Bulk-capable for feed-based workflows',
    ],
  },
  {
    icon: Trophy,
    name: 'AvidiaSEO',
    tagline: 'The highest-quality SEO output.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    description:
      'The premium module. Combines AvidiaExtract data with strict SEO formatting rules and GPT to produce publish-ready descriptions with auto-heal compliance enforcement.',
    bullets: [
      'Strict H1, title, and meta character limits enforced',
      'Auto-heal removes duplication and filler phrases',
      'Sections: Overview, Features, Specs, Manuals',
      'Audit score + what-was-changed report',
    ],
  },
  {
    icon: Download,
    name: 'Export',
    tagline: 'Publish anywhere.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    description:
      'One-click export to the platforms your team already uses. Every output is mapped to the exact fields your eCommerce platform expects.',
    bullets: [
      'Shopify CSV, BigCommerce JSON, WooCommerce CSV',
      'Generic JSON and raw HTML for custom integrations',
      'Bulk export for entire catalogs',
      'Direct API access for enterprise pipelines',
    ],
  },
]

export default function Pipeline() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            The Solution
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-text leading-tight mb-4">
            One pipeline.{' '}
            <span className="gradient-text">End-to-end.</span>
          </h2>
          <p className="text-brand-muted text-lg">
            AvidiaTech is the only platform that combines scraping, normalization, and AI SEO
            generation in a single unified workflow.
          </p>
        </div>

        {/* Pipeline flow */}
        <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
          {modules.map((m, i) => (
            <div key={m.name} className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${m.color}`}>{m.name}</span>
              {i < modules.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-300" />
              )}
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.name}
                className={`rounded-2xl border ${m.borderColor} ${m.bgColor} p-7 hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-text text-lg">{m.name}</h3>
                    <p className={`text-sm font-medium ${m.color}`}>{m.tagline}</p>
                  </div>
                </div>
                <p className="text-brand-muted text-sm leading-relaxed mb-5">{m.description}</p>
                <ul className="space-y-2">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-brand-text">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${m.color} bg-current flex-shrink-0`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
