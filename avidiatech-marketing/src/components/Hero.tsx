import { ArrowRight, Play, CheckCircle2 } from 'lucide-react'

const APP_URL = 'https://app.avidiatech.com'

const proof = [
  '80–95% less manual work',
  'Thousands of SKUs per day',
  'Shopify · BigCommerce · WooCommerce',
]

const pipelineSteps = [
  { label: 'AvidiaExtract', color: 'from-cyan-500 to-cyan-400', desc: 'Scrape & normalize' },
  { label: 'AvidiaDescribe', color: 'from-emerald-500 to-emerald-400', desc: 'AI descriptions' },
  { label: 'AvidiaSEO', color: 'from-fuchsia-500 to-pink-400', desc: 'SEO-optimized output' },
  { label: 'Export', color: 'from-amber-500 to-amber-400', desc: 'Shopify · BC · WooCommerce' },
]

const stats = [
  { value: '18 modules', label: 'in one platform' },
  { value: '14-day', label: 'free trial' },
  { value: '3 platforms', label: 'direct export' },
]

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-hero-gradient overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-primarySoft border border-cyan-200 text-brand-primaryStrong text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            AI-Powered Product Data Automation — Now Live
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Turn messy product data{' '}
            <span className="gradient-text">into SEO-ready content.</span>
            <br />
            Automatically.
          </h1>

          {/* Sub */}
          <p className="text-xl text-brand-muted leading-relaxed max-w-2xl mx-auto mb-8">
            AvidiaTech extracts structured data from any product URL, generates AI-powered
            descriptions, and pushes SEO-optimized content directly to Shopify, BigCommerce,
            or WooCommerce — in seconds, at any scale.
          </p>

          {/* Proof points */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {proof.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-brand-muted">
                <CheckCircle2 className="w-4 h-4 text-brand-secondary flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <a
              href={`${APP_URL}/sign-up`}
              className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primaryStrong text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-cyan-200"
            >
              Start Free 14-Day Trial
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-brand-text font-semibold px-7 py-3.5 rounded-xl text-base transition-colors border border-slate-200"
            >
              <Play className="w-4 h-4 text-brand-primary fill-brand-primary" />
              See how it works
            </a>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {stats.map(({ value, label }) => (
              <div key={value} className="text-center">
                <p className="text-2xl font-extrabold text-brand-text">{value}</p>
                <p className="text-xs text-brand-muted">{label}</p>
              </div>
            ))}
          </div>

          {/* Pipeline visual */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted mb-6">
              The AvidiaTech Pipeline
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {pipelineSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className="text-center">
                    <div
                      className={`bg-gradient-to-br ${step.color} text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-sm mb-1`}
                    >
                      {step.label}
                    </div>
                    <p className="text-xs text-brand-muted">{step.desc}</p>
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-muted mt-6">
              Paste a product URL → get publish-ready SEO content in seconds. No manual work.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
