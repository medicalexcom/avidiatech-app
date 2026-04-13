import type { Metadata } from 'next'
import { Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — AvidiaTech',
  description: 'AvidiaTech Privacy Policy. Learn how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Nav */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Avidia<span className="text-cyan-600">Tech</span></span>
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Effective date: April 9, 2026 · Last updated: April 9, 2026</p>
        </div>

        <div className="space-y-10 text-slate-700">

          <section>
            <p className="text-base leading-relaxed">
              AvidiaTech, Inc. (&quot;AvidiaTech,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our product data automation platform at app.avidiatech.com and avidiatech.com (collectively, the &quot;Service&quot;). Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">1. Information We Collect</h2>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.1 Account Information</h3>
            <p className="text-sm">When you create an account, we collect your name, email address, and password (managed securely by Clerk, Inc., our authentication provider). If you create an organization, we collect the organization name and the email addresses of team members you invite.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.2 Product Data You Submit</h3>
            <p className="text-sm">The Service processes product URLs, raw HTML content fetched from those URLs, extracted product data (names, specifications, descriptions, images), and any files you upload (CSV imports, support attachments). This data is owned by you and processed to deliver the Service.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.3 Usage Data</h3>
            <p className="text-sm">We automatically collect information about how you use the Service, including: features accessed, pipeline runs executed, module usage counts, API calls made, and general interaction patterns. This data is used to operate and improve the Service, enforce usage quotas, and generate aggregate analytics.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.4 Billing Information</h3>
            <p className="text-sm">Payment details (credit card numbers, billing addresses) are collected and processed directly by Stripe, Inc. AvidiaTech does not store full payment card information. We retain Stripe customer IDs and subscription status for billing management.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.5 Support Communications</h3>
            <p className="text-sm">When you contact us via the in-app support chat or email, we collect the content of your messages, any files you share, and your account context (tenant ID, recent activity) to assist in resolving your inquiry.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">1.6 Cookies and Session Data</h3>
            <p className="text-sm">We use cookies and similar technologies for authentication sessions (managed by Clerk), user preferences, and anonymous analytics. You can control cookies through your browser settings, though some cookies are necessary for the Service to function.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Providing the Service:</strong> Processing your product data through our AI pipeline, executing bulk jobs, managing integrations, and delivering outputs</li>
              <li><strong>Authentication and Security:</strong> Verifying your identity, managing sessions, detecting and preventing fraudulent or abusive activity</li>
              <li><strong>Billing and Subscription Management:</strong> Processing payments, enforcing usage quotas, sending invoices and renewal notices</li>
              <li><strong>Customer Support:</strong> Responding to inquiries, resolving issues, and improving support quality</li>
              <li><strong>Service Improvement:</strong> Analyzing aggregate usage patterns (never individual product data) to improve platform features, AI model performance, and reliability</li>
              <li><strong>Communications:</strong> Sending transactional emails (account notices, billing receipts, system alerts) and, where you have opted in, product updates and newsletters</li>
              <li><strong>Legal Compliance:</strong> Meeting our obligations under applicable law, responding to lawful requests, and enforcing our Terms of Service</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-slate-800">We do not sell your personal data. We do not use your product data (URLs, extracted content, AI-generated descriptions) to train shared AI models that benefit other customers without your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">3. Data Sharing and Third-Party Processors</h2>
            <p className="text-sm mb-4">We share your information only with service providers necessary to operate the Service, under strict data processing agreements:</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Provider</th>
                    <th className="text-left px-4 py-3 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Clerk, Inc.', 'Authentication & user management', 'Email, name, account metadata'],
                    ['Stripe, Inc.', 'Payment processing', 'Email, billing address, subscription info'],
                    ['Supabase, Inc.', 'Database & file storage', 'All user and product data'],
                    ['Vercel, Inc.', 'Application hosting', 'Request logs, IP addresses'],
                    ['OpenAI, LLC', 'AI content generation', 'Product data submitted for AI processing'],
                  ].map(([provider, purpose, data]) => (
                    <tr key={provider} className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-800">{provider}</td>
                      <td className="px-4 py-3 text-slate-600">{purpose}</td>
                      <td className="px-4 py-3 text-slate-600">{data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">We do not share your data with advertisers, data brokers, or other third parties for commercial purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">4. Data Storage and Security</h2>
            <p className="text-sm">Your data is stored on Supabase infrastructure located in the United States. Supabase, Vercel, Clerk, and Stripe are all SOC 2 Type II certified providers. Data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</p>
            <p className="mt-3 text-sm">Access to your data within our platform is restricted by tenant isolation — your product data is only accessible to users in your organization. Our internal team accesses customer data only when necessary to provide support, with appropriate access controls.</p>
            <p className="mt-3 text-sm">While we implement strong security measures, no system is 100% secure. If you discover a security issue, please report it to <a href="mailto:security@avidiatech.com" className="text-cyan-600 hover:underline">security@avidiatech.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">5. Data Retention</h2>
            <p className="text-sm">We retain your account and product data for as long as your account is active. If you cancel your account:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5 text-sm">
              <li>You may request a data export within 30 days of cancellation</li>
              <li>Your data is marked for deletion and removed from active systems within 60 days of account closure</li>
              <li>Aggregated, de-identified analytics data may be retained indefinitely</li>
              <li>Billing records and invoices are retained for 7 years as required by law</li>
              <li>Support communications may be retained for up to 2 years</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">6. Your Rights</h2>
            <p className="text-sm mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated personal data</li>
              <li><strong>Export:</strong> Receive your product data in a machine-readable format (CSV/JSON)</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request that we limit processing of your data</li>
            </ul>
            <p className="mt-4 text-sm">To exercise any of these rights, contact us at <a href="mailto:privacy@avidiatech.com" className="text-cyan-600 hover:underline">privacy@avidiatech.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">7. GDPR (European Users)</h2>
            <p className="text-sm">If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, our legal basis for processing your data is:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5 text-sm">
              <li><strong>Contract performance:</strong> Processing necessary to provide the Service you subscribed to</li>
              <li><strong>Legitimate interests:</strong> Service improvement, fraud prevention, security</li>
              <li><strong>Legal obligation:</strong> Compliance with applicable law</li>
              <li><strong>Consent:</strong> Marketing communications (where applicable)</li>
            </ul>
            <p className="mt-3 text-sm">Data transfers to the United States are made under appropriate safeguards, including Standard Contractual Clauses. As a data controller, you remain responsible for the lawful basis for processing personal data you submit to the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">8. CCPA (California Residents)</h2>
            <p className="text-sm">California residents have the right to: know what personal information we collect and how it is used, request deletion of personal information, and opt out of the sale of personal information. We do not sell personal information. To exercise your California privacy rights, contact us at <a href="mailto:privacy@avidiatech.com" className="text-cyan-600 hover:underline">privacy@avidiatech.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-sm">The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">10. Changes to This Policy</h2>
            <p className="text-sm">We may update this Privacy Policy from time to time. We will notify you of material changes by email or in-app notice at least 14 days before the changes take effect. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">11. Contact Us</h2>
            <p className="text-sm">For privacy-related questions or to exercise your rights:</p>
            <div className="mt-3 text-sm space-y-1">
              <p><strong>AvidiaTech, Inc.</strong></p>
              <p>Privacy: <a href="mailto:privacy@avidiatech.com" className="text-cyan-600 hover:underline">privacy@avidiatech.com</a></p>
              <p>General: <a href="mailto:hello@avidiatech.com" className="text-cyan-600 hover:underline">hello@avidiatech.com</a></p>
            </div>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4 text-sm">
          <a href="/" className="text-cyan-600 hover:underline">← Back to home</a>
          <a href="/terms" className="text-slate-500 hover:text-slate-700">Terms of Service →</a>
        </div>
      </div>
    </main>
  )
}
