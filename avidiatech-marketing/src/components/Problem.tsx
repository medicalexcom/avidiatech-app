import { AlertTriangle, FileX, Clock, TrendingDown, Puzzle, DollarSign } from 'lucide-react'

const problems = [
  {
    icon: FileX,
    title: 'Manufacturers provide poor data',
    desc: 'Missing specs, incomplete manuals, no variants. You get a wall of unstructured text and nothing else.',
  },
  {
    icon: Clock,
    title: 'Manual rewriting takes forever',
    desc: 'Teams spend weeks hand-writing descriptions for thousands of SKUs — and the output still isn\'t SEO-optimized.',
  },
  {
    icon: TrendingDown,
    title: 'Duplicate & thin content kills SEO',
    desc: 'Copy-pasted manufacturer descriptions are flagged by search engines, hurting rankings and costing you traffic.',
  },
  {
    icon: DollarSign,
    title: 'Agencies charge $20–$50 per SKU',
    desc: 'For a catalog of 10,000 products, that\'s up to $500k in copywriting costs. There has to be a better way.',
  },
  {
    icon: Puzzle,
    title: 'Fragmented tooling, no end-to-end pipeline',
    desc: 'Scraping tools, AI writers, and SEO platforms don\'t talk to each other. Every step requires manual handoffs.',
  },
  {
    icon: AlertTriangle,
    title: 'PIMs and spreadsheets don\'t scale',
    desc: 'Manual imports, column mapping, and error-prone CSV workflows break down long before you hit 1,000 SKUs.',
  },
]

export default function Problem() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            The Problem
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Product data is broken — and it's costing you.
          </h2>
          <p className="text-slate-400 text-lg">
            Every eCommerce team, distributor, and manufacturer fights the same battle. No existing
            tool solves the full stack.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.title}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Transition statement */}
        <div className="text-center mt-16">
          <p className="text-2xl font-bold text-white">
            No tool combines{' '}
            <span className="text-brand-primary">scraping</span>,{' '}
            <span className="text-brand-secondary">normalization</span>, and{' '}
            <span className="text-brand-ai">AI SEO generation</span> in one place.
          </p>
          <p className="text-slate-400 mt-2 text-lg">Until now.</p>
        </div>
      </div>
    </section>
  )
}
