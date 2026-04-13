import type { Metadata } from 'next'
import { Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — AvidiaTech',
  description: 'AvidiaTech Terms of Service. Read the terms governing your use of the AvidiaTech product data automation platform.',
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Effective date: April 9, 2026 · Last updated: April 9, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-10 text-slate-700">

          <section>
            <p className="text-base leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of the AvidiaTech platform, including the web application at app.avidiatech.com, all APIs, and all related services (collectively, the &quot;Service&quot;), operated by AvidiaTech, Inc. (&quot;AvidiaTech,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By creating an account or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">1. Description of Service</h2>
            <p>AvidiaTech provides an AI-powered product data automation platform that includes the following modules and capabilities:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5 text-sm">
              <li><strong>AvidiaExtract</strong> — Automated extraction of structured product data from manufacturer and supplier URLs</li>
              <li><strong>AvidiaDescribe</strong> — AI-generated product descriptions, bullet points, and content</li>
              <li><strong>AvidiaSEO</strong> — SEO-optimized title tags, meta descriptions, and structured content</li>
              <li><strong>AvidiaTranslate</strong> — AI-powered product content translation across languages</li>
              <li><strong>AvidiaMonitor</strong> — Real-time monitoring of product pages for price, availability, and specification changes</li>
              <li><strong>Bulk Processing</strong> — Large-scale batch processing of product catalogs</li>
              <li><strong>Import & Connectors</strong> — CSV/JSON imports and direct platform connectors for Shopify, BigCommerce, and WooCommerce</li>
              <li><strong>AI Assistant</strong> — Context-aware in-app assistant for platform guidance</li>
              <li><strong>Support Chat</strong> — Direct communication channel with AvidiaTech support staff</li>
            </ul>
            <p className="mt-4 text-sm">We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with reasonable notice where practicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">2. Accounts and Registration</h2>
            <p className="text-sm">To access the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5 text-sm">
              <li>Provide accurate, current, and complete account information</li>
              <li>Maintain the security of your credentials and promptly notify us of any unauthorized use</li>
              <li>Accept responsibility for all activity that occurs under your account</li>
              <li>Not share your account credentials with unauthorized third parties</li>
              <li>Not create accounts through automated means or under false pretenses</li>
            </ul>
            <p className="mt-4 text-sm">Account authentication is handled by Clerk, Inc. Your use of Clerk&apos;s services is governed by Clerk&apos;s own terms of service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">3. Subscriptions, Billing, and Payment</h2>
            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.1 Subscription Plans</h3>
            <p className="text-sm">The Service is offered on a subscription basis. Plan details, including pricing and usage quotas, are displayed on our pricing page at avidiatech.com/#pricing. Current plans include Starter, Growth, Pro, and Enterprise tiers.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.2 Free Trials</h3>
            <p className="text-sm">We may offer free trial periods. At the end of a free trial, your account will be charged for the selected plan unless you cancel before the trial expires. Trial terms are specified at the time of sign-up.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.3 Billing</h3>
            <p className="text-sm">All payments are processed by Stripe, Inc. By providing payment information, you authorize AvidiaTech to charge your payment method on a recurring basis according to your selected plan. All fees are in USD and are exclusive of applicable taxes. You are responsible for all applicable taxes.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.4 Auto-Renewal</h3>
            <p className="text-sm">Subscriptions automatically renew at the end of each billing period (monthly or annually, per your selection) unless you cancel before the renewal date. You can cancel at any time from your billing settings.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.5 Cancellation and Refunds</h3>
            <p className="text-sm">You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period; you retain access to the Service until that date. We do not offer refunds for partial billing periods, except as required by applicable law or in cases of billing errors on our part.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">3.6 Usage Quotas and Overages</h3>
            <p className="text-sm">Each plan includes monthly quotas for specific features (extractions, SEO generations, etc.). When you reach your quota, the relevant feature will be restricted until your quota resets at the start of your next billing period. Quota resets do not roll over.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">4. Acceptable Use Policy</h2>
            <p className="text-sm">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5 text-sm">
              <li>Violate any applicable law, regulation, or third-party rights</li>
              <li>Scrape, crawl, or extract data from websites in violation of those websites&apos; terms of service</li>
              <li>Generate, distribute, or store content that is illegal, harmful, defamatory, or infringing</li>
              <li>Attempt to gain unauthorized access to AvidiaTech systems or other users&apos; accounts</li>
              <li>Conduct denial-of-service attacks or other disruptive technical attacks</li>
              <li>Circumvent usage quotas, rate limits, or other technical restrictions</li>
              <li>Resell or sublicense access to the Service without written authorization from AvidiaTech</li>
              <li>Use the Service to train competing AI models using AvidiaTech&apos;s proprietary AI outputs</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
            </ul>
            <p className="mt-4 text-sm">We reserve the right to suspend or terminate accounts found in violation of these policies, without refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">5. Intellectual Property</h2>
            <h3 className="font-semibold text-slate-800 mt-4 mb-2">5.1 AvidiaTech Property</h3>
            <p className="text-sm">The Service, including all software, algorithms, AI models, user interfaces, APIs, documentation, and trademarks, is owned by AvidiaTech, Inc. and protected by intellectual property laws. These Terms do not transfer any ownership rights to you.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">5.2 Your Content and Data</h3>
            <p className="text-sm">You retain all ownership rights to the product data, URLs, and content you submit to the Service (&quot;Your Content&quot;). By submitting Your Content, you grant AvidiaTech a limited, non-exclusive license to process Your Content solely to provide the Service. We do not claim ownership of Your Content.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">5.3 AI-Generated Output</h3>
            <p className="text-sm">Subject to your compliance with these Terms and applicable law, you own the AI-generated descriptions, SEO content, and other outputs produced by the Service based on Your Content.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">5.4 Feedback</h3>
            <p className="text-sm">If you provide feedback about the Service, you grant AvidiaTech a perpetual, irrevocable, royalty-free license to use that feedback for any purpose, including improving the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">6. Data and Privacy</h2>
            <p className="text-sm">Your use of the Service is also governed by our <a href="/privacy" className="text-cyan-600 hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to our data practices as described in the Privacy Policy.</p>
            <p className="mt-3 text-sm">We implement industry-standard security measures to protect your data. However, no system is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">7. Service Availability</h2>
            <p className="text-sm">We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We may perform scheduled or emergency maintenance that temporarily limits access. We will provide reasonable advance notice for planned downtime where practicable.</p>
            <p className="mt-3 text-sm">Current system status is available at <a href="https://app.avidiatech.com/status" className="text-cyan-600 hover:underline">app.avidiatech.com/status</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">8. Disclaimers and Limitation of Liability</h2>
            <h3 className="font-semibold text-slate-800 mt-4 mb-2">8.1 Disclaimer of Warranties</h3>
            <p className="text-sm">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, THAT AI-GENERATED CONTENT WILL BE ACCURATE OR SUITABLE FOR YOUR SPECIFIC USE CASE, OR THAT THE SERVICE WILL MEET YOUR REQUIREMENTS.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-2">8.2 Limitation of Liability</h3>
            <p className="text-sm">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AVIDIATECH&apos;S TOTAL LIABILITY FOR ALL CLAIMS ARISING UNDER THESE TERMS WILL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO AVIDIATECH IN THE TWELVE MONTHS PRECEDING THE CLAIM; OR (B) ONE HUNDRED US DOLLARS ($100). IN NO EVENT WILL AVIDIATECH BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">9. Indemnification</h2>
            <p className="text-sm">You agree to indemnify, defend, and hold harmless AvidiaTech, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) Your Content; (c) your violation of these Terms; or (d) your violation of any third-party rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">10. Termination</h2>
            <p className="text-sm">Either party may terminate these Terms at any time. We may suspend or terminate your access immediately if you violate these Terms, fail to pay fees, or if we determine (in our reasonable discretion) that continued access poses legal, security, or reputational risk. Upon termination, your right to use the Service ceases. Provisions of these Terms that by their nature should survive termination will survive, including intellectual property, disclaimers, indemnification, and limitation of liability.</p>
            <p className="mt-3 text-sm">Upon your written request within 30 days of account termination, we will provide a data export of Your Content in a machine-readable format.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">11. Governing Law and Dispute Resolution</h2>
            <p className="text-sm">These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles. You agree to submit to the exclusive jurisdiction of courts located in Delaware for resolution of any dispute arising from these Terms. Notwithstanding the foregoing, either party may seek injunctive relief in any jurisdiction to protect intellectual property rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">12. Changes to These Terms</h2>
            <p className="text-sm">We may update these Terms from time to time. We will notify you of material changes by email or by posting a notice in the application at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes your acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service and cancel your subscription.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">13. Contact</h2>
            <p className="text-sm">For questions about these Terms, contact us:</p>
            <div className="mt-3 text-sm space-y-1">
              <p><strong>AvidiaTech, Inc.</strong></p>
              <p>Email: <a href="mailto:legal@avidiatech.com" className="text-cyan-600 hover:underline">legal@avidiatech.com</a></p>
              <p>Support: <a href="mailto:support@avidiatech.com" className="text-cyan-600 hover:underline">support@avidiatech.com</a></p>
            </div>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4 text-sm">
          <a href="/" className="text-cyan-600 hover:underline">← Back to home</a>
          <a href="/privacy" className="text-slate-500 hover:text-slate-700">Privacy Policy →</a>
        </div>
      </div>
    </main>
  )
}
