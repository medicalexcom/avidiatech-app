import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <div className="relative min-h-[100dvh] bg-white text-slate-900 overflow-hidden dark:bg-[#09090b] dark:text-slate-50">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-400/10 blur-[120px] dark:bg-indigo-500/8" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-violet-400/8 blur-[100px] dark:bg-violet-500/6" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }}
        />
      </div>
      {/* Top gradient stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />

      {/* Sticky top nav bar */}
      <nav className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Dashboard
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-[12.5px] font-medium text-slate-900 dark:text-slate-100">Terms of Service</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/legal/privacy"
            className="text-[12px] text-slate-400 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:text-slate-500 dark:hover:text-indigo-400"
          >
            Privacy Policy
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective Date: April 12, 2026 &nbsp;&middot;&nbsp; Last Updated: April 12, 2026
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">

          {/* Preamble */}
          <section>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) and AvidiaTech (&ldquo;AvidiaTech&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) governing your access to and use of the AvidiaTech product data automation platform at{" "}
              <a href="https://avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">avidiatech.com</a>{" "}
              (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Eligibility and Account Registration
            </h2>
            <p>
              You must be at least 18 years old and have the legal authority to enter into contracts on behalf of yourself or your organisation to use the Service. You agree to provide accurate, complete, and current registration information and to keep it updated. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at{" "}
              <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">support@avidiatech.com</a>{" "}
              if you suspect any unauthorised access.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Subscriptions and Free Trial
            </h2>
            <p className="mb-2">
              <strong>Free Trial:</strong> New accounts receive a 14-day free trial with access to Starter-tier features. No credit card is required to start a trial. At the end of the trial period, continued access requires selecting a paid plan. We may, at our discretion, extend or modify trials.
            </p>
            <p className="mb-2">
              <strong>Paid Plans:</strong> We offer three subscription tiers — Starter, Growth, and Pro — with different usage quotas and features. Plan details and current pricing are available on our{" "}
              <Link href="/dashboard/pricing" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">pricing page</Link>.
            </p>
            <p className="mb-2">
              <strong>Billing Cycle:</strong> Subscriptions are billed on a monthly basis on the anniversary of your subscription start date. Annual billing options may be available at a discounted rate.
            </p>
            <p className="mb-2">
              <strong>Automatic Renewal:</strong> Subscriptions renew automatically at the end of each billing period. You authorise us to charge your payment method on file for each renewal. You may cancel auto-renewal at any time before the next billing date.
            </p>
            <p>
              <strong>Usage Quotas:</strong> Each plan includes monthly usage quotas for extractions, descriptions, translations, and other AI operations. Usage resets at the start of each billing period. Overages are not charged; instead, requests exceeding your quota will be queued or declined until the next period or a plan upgrade.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              3. Payment and Pricing
            </h2>
            <p className="mb-2">
              All payments are processed by Stripe. By providing a payment method, you represent that you are authorised to use it and authorise AvidiaTech to charge it for amounts due. Prices are listed in US Dollars (USD) unless otherwise stated.
            </p>
            <p className="mb-2">
              <strong>Price Changes:</strong> We reserve the right to change our prices. If we increase prices for your current plan, we will provide at least 30 days&rsquo; advance notice by email. Continued use of the Service after the effective date constitutes acceptance of the new pricing. If you do not accept the new pricing, you may cancel before the effective date.
            </p>
            <p>
              <strong>Taxes:</strong> Prices do not include applicable taxes (such as VAT or sales tax), which may be added based on your billing address and applicable law. You are responsible for all taxes associated with your use of the Service.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              4. Refund Policy
            </h2>
            <p className="mb-2">
              <strong>Trial period:</strong> No charges apply during your 14-day free trial. If you do not add a payment method, your account will automatically downgrade to a read-only state after the trial ends.
            </p>
            <p className="mb-2">
              <strong>Monthly subscriptions:</strong> Subscription fees are non-refundable except where required by applicable law. If you cancel your subscription, you will retain access to the Service until the end of the current billing period; no partial refunds are issued for unused days.
            </p>
            <p className="mb-2">
              <strong>Exceptional circumstances:</strong> We may issue refunds on a case-by-case basis for service outages exceeding our SLA commitments or other extraordinary circumstances. To request a refund, contact{" "}
              <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">support@avidiatech.com</a>{" "}
              within 14 days of the charge.
            </p>
            <p>
              <strong>Chargebacks:</strong> If you initiate a chargeback without first contacting us, we reserve the right to immediately suspend your account pending investigation.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              5. Cancellation
            </h2>
            <p>
              You may cancel your subscription at any time from the billing settings in your dashboard. Cancellation takes effect at the end of the current billing period. After cancellation, your account data is retained for 90 days in a read-only state, after which it may be permanently deleted. You may re-subscribe at any time during this retention period to restore full access without data loss.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              6. Acceptable Use
            </h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Use the Service for any illegal purpose or in violation of any applicable law.</li>
              <li>Scrape, harvest, or extract data from websites in violation of their terms of service.</li>
              <li>Attempt to gain unauthorised access to the Service or its infrastructure.</li>
              <li>Reverse engineer, decompile, or create derivative works of the Service.</li>
              <li>Resell or sublicence the Service to third parties without our prior written consent.</li>
              <li>Use the Service to process content that infringes intellectual property rights, is defamatory, obscene, or otherwise unlawful.</li>
              <li>Introduce malware or other malicious code.</li>
              <li>Conduct load tests or stress tests that could degrade Service performance for others.</li>
              <li>Circumvent or attempt to circumvent usage quotas or billing controls.</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate this section with or without notice, and to take legal action where appropriate.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              7. Intellectual Property
            </h2>
            <p className="mb-2">
              <strong>AvidiaTech IP:</strong> The Service, including all software, designs, logos, and documentation, is owned by AvidiaTech and protected by copyright, trademark, and other intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Service solely as described in these Terms.
            </p>
            <p>
              <strong>Your Content:</strong> You retain ownership of all product data and content you submit to the Service (&ldquo;Customer Content&rdquo;). You grant AvidiaTech a limited licence to process Customer Content solely to provide the Service to you. We do not use your Customer Content to train AI models or share it with other customers.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              8. Confidentiality
            </h2>
            <p>
              Each party agrees to keep confidential the other party&rsquo;s non-public information received in connection with the Service. AvidiaTech will not share your Customer Content or business information with third parties except as necessary to provide the Service or as required by law.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              9. Service Availability and SLA
            </h2>
            <p>
              We target 99.5% monthly uptime for the Service, excluding scheduled maintenance (which we aim to perform outside of peak hours with advance notice). Downtime resulting from factors beyond our control — including third-party service outages (e.g., Stripe, Supabase, Vercel), internet disruptions, or force majeure events — does not count against our uptime commitment.
            </p>
            <p className="mt-2">
              We reserve the right to perform scheduled maintenance at any time. We will use commercially reasonable efforts to provide at least 48 hours&rsquo; notice of planned maintenance that may affect Service availability.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              10. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI-GENERATED OUTPUT WILL BE ACCURATE OR COMPLETE. YOU ASSUME ALL RISK ARISING FROM YOUR USE OF THE SERVICE AND ANY CONTENT GENERATED BY IT.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              11. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AVIDIATECH, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO THESE TERMS OR YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-2">
              OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO AVIDIATECH DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).
            </p>
            <p className="mt-2">
              Some jurisdictions do not allow the exclusion of implied warranties or limitation of liability for consequential damages, so the above limitations may not apply to you.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              12. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless AvidiaTech and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo; fees) arising out of or in any way related to (a) your use of or inability to use the Service, (b) your violation of these Terms, (c) your Customer Content, or (d) your violation of any third-party rights.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              13. Termination
            </h2>
            <p className="mb-2">
              <strong>By you:</strong> You may terminate your account at any time by cancelling your subscription and requesting account deletion at{" "}
              <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">support@avidiatech.com</a>.
            </p>
            <p className="mb-2">
              <strong>By us:</strong> We may suspend or terminate your account immediately and without notice if you materially breach these Terms, engage in fraudulent or abusive activity, or if required by law. We may also terminate or suspend the Service generally with 30 days&rsquo; notice.
            </p>
            <p>
              Upon termination, all licences granted to you cease immediately. Provisions that by their nature should survive termination (including Sections 7, 10, 11, 12, 14, and 15) will survive.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              14. Governing Law and Dispute Resolution
            </h2>
            <p className="mb-2">
              These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict of law principles.
            </p>
            <p className="mb-2">
              <strong>Informal resolution:</strong> Before filing any legal claim, you agree to first contact us at{" "}
              <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">support@avidiatech.com</a>{" "}
              and give us 30 days to attempt to resolve the dispute informally.
            </p>
            <p>
              <strong>Arbitration:</strong> Any dispute not resolved informally shall be settled by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. You waive any right to bring claims as a class action or class-wide arbitration. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              15. General
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and any Order Form or plan-specific addenda, constitute the entire agreement between you and AvidiaTech regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</li>
              <li><strong>Assignment:</strong> You may not assign these Terms or your rights under them without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.</li>
              <li><strong>Notices:</strong> All notices to AvidiaTech under these Terms must be sent to{" "}<a href="mailto:legal@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">legal@avidiatech.com</a>. Notices to you will be sent to the email address on your account.</li>
              <li><strong>Changes to Terms:</strong> We may update these Terms at any time. If we make material changes, we will notify you by email at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance.</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              16. Contact Us
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-semibold text-slate-800 dark:text-slate-200">AvidiaTech</p>
              <p className="mt-1">
                General:{" "}
                <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">
                  support@avidiatech.com
                </a>
              </p>
              <p className="mt-1">
                Legal:{" "}
                <a href="mailto:legal@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">
                  legal@avidiatech.com
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <span>© {new Date().getFullYear()} AvidiaTech. All rights reserved.</span>
          <Link
            href="/legal/privacy"
            className="underline underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            ← Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
