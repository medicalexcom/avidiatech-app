import { Link2, ScanLine, Sparkles, Eye, Upload } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Link2,
    title: 'Enter a product URL',
    desc: 'Paste any manufacturer or distributor product page URL. Configure extraction options — specs, manuals, variants.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    number: '02',
    icon: ScanLine,
    title: 'AvidiaExtract scrapes & normalizes',
    desc: 'The ingestion engine fetches the page, parses specs, manuals, variants, images, and source SEO data into clean JSON.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Generate your SEO description',
    desc: 'Click "Generate SEO Description". AvidiaSEO combines your product data with strict formatting rules and GPT to produce publish-ready content.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    number: '04',
    icon: Eye,
    title: 'Review the output',
    desc: 'Inspect the H1, title tag, meta description, HTML description, features list, and auto-heal report. All in one view.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    number: '05',
    icon: Upload,
    title: 'Export to your platform',
    desc: 'Download as Shopify CSV, BigCommerce JSON, WooCommerce CSV, or raw JSON. Bulk export entire catalogs in one click.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-text leading-tight mb-4">
            From URL to published content{' '}
            <span className="gradient-text">in seconds.</span>
          </h2>
          <p className="text-brand-muted text-lg">
            Five steps. One workflow. No manual copy-paste between tools.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line connector */}
          <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-cyan-200 via-pink-200 to-violet-200 hidden lg:block" />

          <div className="space-y-6">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className="relative flex gap-6 items-start bg-brand-bg rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Step number + icon */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{step.number}</span>
                  </div>

                  {/* Content */}
                  <div className="pt-1.5">
                    <h3 className="font-bold text-brand-text text-lg mb-1">{step.title}</h3>
                    <p className="text-brand-muted leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom note */}
        <div className="text-center mt-12 p-6 bg-brand-primarySoft border border-cyan-200 rounded-2xl">
          <p className="font-semibold text-brand-primaryStrong">
            Starting from short text instead of a URL?
          </p>
          <p className="text-brand-muted text-sm mt-1">
            Use <strong>AvidiaDescribe</strong> — paste any product blurb and get a full
            SEO-ready description without scraping.
          </p>
        </div>
      </div>
    </section>
  )
}
