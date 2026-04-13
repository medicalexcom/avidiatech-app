import { Check, Zap } from 'lucide-react'

const APP_URL = 'https://app.avidiatech.com'

const tiers = [
  {
    name: 'Starter',
    price: '$149',
    period: '/month',
    annual: '$1,490/year',
    annualNote: 'Save $298 with annual billing',
    desc: 'For small eCommerce stores and solo operators getting started with product data automation.',
    cta: 'Start Free Trial',
    ctaHref: `${APP_URL}/sign-up?plan=starter`,
    highlight: false,
    features: [
      '500 product extractions/month (AvidiaExtract)',
      '1,000 description generations (AvidiaDescribe)',
      '1,000 SEO generations (AvidiaSEO)',
      '1 eCommerce integration (Shopify, BigCommerce, or WooCommerce)',
      '25 Monitor watches',
      'CSV/JSON import & export',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$399',
    period: '/month',
    annual: '$3,990/year',
    annualNote: 'Save $798 with annual billing',
    desc: 'For growing brands, distributors, and multi-channel sellers who need more volume and advanced features.',
    cta: 'Start Free Trial',
    ctaHref: `${APP_URL}/sign-up?plan=growth`,
    highlight: true,
    badge: 'Most Popular',
    features: [
      '2,500 product extractions/month',
      '5,000 description generations',
      '5,000 SEO generations',
      '5 integrations (any combination)',
      '250 Monitor watches',
      'AvidiaTranslate — 2,500 translations/month',
      'Variants, Specs & Match modules',
      '3 team seats',
      'Priority support',
    ],
  },
  {
    name: 'Scale',
    price: '$899',
    period: '/month',
    annual: '$8,990/year',
    annualNote: 'Save $1,798 with annual billing',
    desc: 'For high-volume teams, manufacturers, large eCommerce companies, and agencies managing many clients.',
    cta: 'Start Free Trial',
    ctaHref: `${APP_URL}/sign-up?plan=scale`,
    highlight: false,
    features: [
      '10,000 product extractions/month',
      'Unlimited descriptions + SEO',
      'Unlimited integrations',
      '2,000 Monitor watches (hourly checks)',
      'AvidiaTranslate — unlimited',
      'Bulk processing priority queue',
      '10 team seats',
      'Dedicated account manager',
      'Phone + priority support',
      '99.5% uptime SLA',
    ],
  },
]

const enterpriseFeatures = [
  'Unlimited extractions, SEO & descriptions',
  'Custom AI model fine-tuning per vertical',
  'Dedicated scraping infrastructure',
  'White-label for agencies',
  'ERP/PIM integrations (NetSuite, Salsify, Akeneo)',
  '99.9% uptime SLA + 2hr incident response',
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-text leading-tight mb-4">
            Simple, usage-based pricing.
          </h2>
          <p className="text-brand-muted text-lg">
            Start free. Scale as you grow. Save up to 20% with annual billing.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                tier.highlight
                  ? 'bg-brand-primary border-brand-primary shadow-2xl shadow-cyan-200 scale-[1.02]'
                  : 'bg-white border-slate-200 hover:shadow-md'
              } transition-all`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`font-bold text-lg mb-1 ${
                    tier.highlight ? 'text-white' : 'text-brand-text'
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="flex items-end gap-1 mb-1">
                  <span
                    className={`text-4xl font-extrabold ${
                      tier.highlight ? 'text-white' : 'text-brand-text'
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span
                    className={`text-sm mb-1 ${
                      tier.highlight ? 'text-cyan-100' : 'text-brand-muted'
                    }`}
                  >
                    {tier.period}
                  </span>
                </div>
                <p
                  className={`text-xs mb-3 ${
                    tier.highlight ? 'text-cyan-200' : 'text-brand-muted'
                  }`}
                >
                  {tier.annualNote}
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    tier.highlight ? 'text-cyan-50' : 'text-brand-muted'
                  }`}
                >
                  {tier.desc}
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-7">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        tier.highlight ? 'text-white' : 'text-brand-secondary'
                      }`}
                    />
                    <span className={tier.highlight ? 'text-cyan-50' : 'text-brand-text'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                className={`text-center font-semibold py-3 rounded-xl text-sm transition-colors ${
                  tier.highlight
                    ? 'bg-white text-brand-primaryStrong hover:bg-cyan-50'
                    : 'bg-brand-primary hover:bg-brand-primaryStrong text-white'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="bg-slate-950 rounded-2xl p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl mb-1">Enterprise & Agency</h3>
              <p className="text-slate-400 text-sm">
                Custom pricing for high-volume operations and agency white-labeling.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 flex-1 max-w-xl">
            {enterpriseFeatures.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-brand-secondary flex-shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
          <a
            href="mailto:sales@avidiatech.com"
            className="flex-shrink-0 bg-white hover:bg-slate-100 text-slate-900 font-semibold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            Contact Sales
          </a>
        </div>

        <p className="text-center text-sm text-brand-muted mt-6">
          All plans include a 14-day free trial. No credit card required to get started.
        </p>
      </div>
    </section>
  )
}
