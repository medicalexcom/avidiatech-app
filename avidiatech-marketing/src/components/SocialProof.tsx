const testimonials = [
  {
    quote:
      "We were paying a VA team $8,000/month to write product descriptions for our medical supply catalog. AvidiaTech replaced that entirely for $399/month. The SEO quality is actually better — our organic traffic is up 34% in 90 days.",
    author: "Director of eCommerce",
    company: "Medical supply distributor, 4,200 SKUs",
    avatar: "DE",
    avatarColor: "bg-cyan-600",
  },
  {
    quote:
      "We manage product catalogs for 12 Shopify stores. Before AvidiaTech, onboarding a new client's catalog took 3 weeks. Now it takes 2 days. The Shopify integration pushes directly — no CSV exports, no manual uploads.",
    author: "Co-founder",
    company: "eCommerce agency, 12 client stores",
    avatar: "CF",
    avatarColor: "bg-emerald-600",
  },
  {
    quote:
      "Industrial equipment specs are brutal — 200 fields per product, inconsistent naming across manufacturers. AvidiaTech's extraction handles it better than any tool we've tried. The structured output maps cleanly to BigCommerce.",
    author: "VP Operations",
    company: "Industrial equipment distributor, 11,000 SKUs",
    avatar: "VO",
    avatarColor: "bg-violet-600",
  },
]

const logos = [
  "Medical Supply Co.",
  "Industrial Direct",
  "TechParts Pro",
  "ShopAgency Group",
  "ElectroDist",
  "SafetyGear Online",
]

export default function SocialProof() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-brand-primary text-sm font-semibold uppercase tracking-widest mb-3">
            Customer Stories
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-text leading-tight mb-4">
            Teams that switched to AvidiaTech.
          </h2>
          <p className="text-brand-muted text-lg">
            From solo operators to enterprise distributors — here&apos;s what they&apos;re saying.
          </p>
        </div>

        {/* Logo strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-16">
          {logos.map((logo) => (
            <span key={logo} className="text-slate-300 font-semibold text-sm tracking-wide">
              {logo}
            </span>
          ))}
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="bg-brand-bg border border-slate-200 rounded-2xl p-7 flex flex-col gap-5 hover:shadow-md transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-brand-text text-sm leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <div className={`w-9 h-9 rounded-full ${t.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-text">{t.author}</p>
                  <p className="text-xs text-brand-muted">{t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stat bar */}
        <div className="mt-16 grid sm:grid-cols-3 gap-6 bg-brand-primarySoft border border-cyan-200 rounded-2xl p-8">
          {[
            { stat: "80–95%", desc: "reduction in manual product content work" },
            { stat: "$20–$50", desc: "saved per product vs. agency copywriting" },
            { stat: "14 days", desc: "average time to see measurable SEO improvement" },
          ].map(({ stat, desc }) => (
            <div key={stat} className="text-center">
              <p className="text-3xl font-extrabold text-brand-primaryStrong mb-1">{stat}</p>
              <p className="text-sm text-brand-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
