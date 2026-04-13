import type { Metadata } from 'next'
import { Zap, Mail, MessageSquare, FileText, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact AvidiaTech — AI Product Data Automation',
  description: 'Get in touch with the AvidiaTech team. Sales questions, technical support, enterprise inquiries.',
}

const APP_URL = 'https://app.avidiatech.com'

const contacts = [
  {
    icon: MessageSquare,
    title: 'Support Chat',
    desc: 'Already a customer? Use the in-app support chat for the fastest response.',
    action: 'Open support chat',
    href: `${APP_URL}/dashboard/support`,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: Mail,
    title: 'General Inquiries',
    desc: 'Questions about AvidiaTech, partnerships, or press inquiries.',
    action: 'hello@avidiatech.com',
    href: 'mailto:hello@avidiatech.com',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Building2,
    title: 'Enterprise & Agency Sales',
    desc: 'Custom pricing for high-volume teams, agencies, and white-label deployments.',
    action: 'sales@avidiatech.com',
    href: 'mailto:sales@avidiatech.com',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: FileText,
    title: 'Legal & Privacy',
    desc: 'Privacy requests, GDPR/CCPA inquiries, legal notices, and data deletion requests.',
    action: 'legal@avidiatech.com',
    href: 'mailto:legal@avidiatech.com',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
]

export default function ContactPage() {
  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Nav */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Avidia<span className="text-cyan-600">Tech</span></span>
          </a>
          <div className="flex items-center gap-3">
            <a href={`${APP_URL}/sign-in`} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-3 py-2">Sign In</a>
            <a href={`${APP_URL}/sign-up`} className="text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors">Start Free Trial</a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-3">Contact</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Get in touch</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            We&apos;re a small, focused team. We respond to all inquiries within one business day.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid sm:grid-cols-2 gap-5 mb-14">
          {contacts.map((c) => {
            const Icon = c.icon
            return (
              <a
                key={c.title}
                href={c.href}
                className="group bg-white rounded-2xl border border-slate-200 p-7 hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-4"
              >
                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                </div>
                <div className={`text-sm font-medium ${c.color} group-hover:underline`}>{c.action}</div>
              </a>
            )
          })}
        </div>

        {/* FAQ quick answers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'How long does the free trial last?',
                a: 'Your free trial gives you 14 days of full access to the Growth plan. No credit card required to start.',
              },
              {
                q: 'Can I process my entire product catalog?',
                a: 'Yes. Use the Import module to upload a CSV of your product URLs and run bulk processing across your entire catalog. Enterprise plans support unlimited processing.',
              },
              {
                q: 'Which eCommerce platforms are supported?',
                a: 'Shopify, BigCommerce, and WooCommerce via direct API connectors. You can also export to CSV/JSON for any other platform.',
              },
              {
                q: 'Is my product data secure?',
                a: 'Yes. All data is encrypted in transit and at rest, stored in tenant-isolated Supabase databases. We never share your product data with other customers.',
              },
              {
                q: 'Do you offer white-label or agency pricing?',
                a: 'Yes. Contact sales@avidiatech.com for agency and white-label options. We support managing multiple client tenants from a single account.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                <h4 className="font-semibold text-slate-900 mb-1.5 text-sm">{q}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-slate-400">
          <a href="/" className="text-cyan-600 hover:underline">← Back to home</a>
        </div>
      </div>
    </main>
  )
}
