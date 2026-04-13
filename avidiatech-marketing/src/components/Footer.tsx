import { Zap } from 'lucide-react'

const APP_URL = 'https://app.avidiatech.com'

const links = {
  Product: [
    { label: 'AvidiaExtract', href: '/#features' },
    { label: 'AvidiaDescribe', href: '/#features' },
    { label: 'AvidiaSEO', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'How It Works', href: '/#how-it-works' },
  ],
  Platform: [
    { label: 'Dashboard', href: APP_URL },
    { label: 'Documentation', href: `${APP_URL}/docs` },
    { label: 'API Reference', href: `${APP_URL}/docs/api` },
    { label: 'Integrations', href: `${APP_URL}/docs/integrations` },
    { label: 'System Status', href: `${APP_URL}/status` },
  ],
  Company: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'Support', href: `${APP_URL}/dashboard/support` },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Avidia<span className="text-brand-primary">Tech</span>
              </span>
            </a>
            <p className="text-sm leading-relaxed max-w-xs mb-4">
              AI-powered product data automation. Extract, describe, and SEO-optimize thousands
              of products automatically.
            </p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                <a href="mailto:hello@avidiatech.com" className="hover:text-slate-300 transition-colors">
                  hello@avidiatech.com
                </a>
              </p>
              <p>
                <a href="mailto:support@avidiatech.com" className="hover:text-slate-300 transition-colors">
                  support@avidiatech.com
                </a>
              </p>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-white text-sm mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} AvidiaTech, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <a href="/terms" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</a>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
