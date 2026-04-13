import { ArrowRight, Sparkles } from 'lucide-react'

const APP_URL = 'https://app.avidiatech.com'

export default function CTABanner() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-3xl p-12 sm:p-16 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-brand-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-brand-secondary/10 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Free trial. No credit card required.
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
              Stop rewriting product pages manually.
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Join the teams already using AvidiaTech to automate their entire product content
              workflow — from raw URL to published SEO description.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`${APP_URL}/sign-up`}
                className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primaryStrong text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-cyan-500/20"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors border border-white/10"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
