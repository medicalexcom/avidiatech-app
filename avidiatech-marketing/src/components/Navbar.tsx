'use client'

import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

const APP_URL = 'https://app.avidiatech.com'

const navLinks = [
  { label: 'Product', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: `${APP_URL}/docs` },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-brand-text tracking-tight">
              Avidia<span className="text-brand-primary">Tech</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`${APP_URL}/sign-in`}
              className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors px-3 py-2"
            >
              Sign In
            </a>
            <a
              href={`${APP_URL}/sign-up`}
              className="text-sm font-semibold bg-brand-primary hover:bg-brand-primaryStrong text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start Free Trial
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-brand-muted"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <a
              href={`${APP_URL}/sign-in`}
              className="text-sm font-medium text-center text-brand-muted hover:text-brand-text py-2"
            >
              Sign In
            </a>
            <a
              href={`${APP_URL}/sign-up`}
              className="text-sm font-semibold text-center bg-brand-primary hover:bg-brand-primaryStrong text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
