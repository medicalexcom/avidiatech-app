import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-[100dvh] bg-white text-slate-900 overflow-hidden dark:bg-[#09090b] dark:text-slate-50">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-400/10 blur-[120px] dark:bg-violet-500/8" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-indigo-400/8 blur-[100px] dark:bg-indigo-500/6" />
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
        <span className="text-[12.5px] font-medium text-slate-900 dark:text-slate-100">Privacy Policy</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/legal/terms"
            className="text-[12px] text-slate-400 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:text-slate-500 dark:hover:text-indigo-400"
          >
            Terms of Service
          </Link>
        </div>
      </nav>

      <div className="prose-body mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective Date: April 12, 2026 &nbsp;&middot;&nbsp; Last Updated: April 12, 2026
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Who We Are
            </h2>
            <p>
              AvidiaTech (&ldquo;AvidiaTech&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the product data automation platform available at{" "}
              <a href="https://avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">avidiatech.com</a>{" "}
              (the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service.
            </p>
            <p className="mt-2">
              For the purposes of the General Data Protection Regulation (GDPR) and similar laws, AvidiaTech is the data controller of personal information collected through the Service.
            </p>
            <p className="mt-2">
              If you have any questions about this Policy, please contact us at{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">privacy@avidiatech.com</a>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Information We Collect
            </h2>
            <p className="mb-2 font-medium text-slate-800 dark:text-slate-200">a. Information you provide directly</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Account information:</strong> name, email address, and password (managed through Clerk, our identity provider).</li>
              <li><strong>Billing information:</strong> payment method details are collected and stored by Stripe, our payment processor. We receive only non-sensitive identifiers such as the last four digits of your card and billing address.</li>
              <li><strong>Organization details:</strong> company name and team member email addresses you invite.</li>
              <li><strong>User content:</strong> product data, URLs, descriptions, translations, and other content you submit for processing.</li>
              <li><strong>Communications:</strong> messages you send to our support team.</li>
            </ul>

            <p className="mb-2 mt-4 font-medium text-slate-800 dark:text-slate-200">b. Information collected automatically</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Usage data:</strong> pages visited, features used, API calls made, and usage counts (extractions, descriptions, translations, etc.).</li>
              <li><strong>Device and log data:</strong> IP address, browser type, operating system, referring URLs, and timestamps.</li>
              <li><strong>Cookies and similar technologies:</strong> session cookies required for authentication and optional analytics cookies (see Section 6).</li>
            </ul>

            <p className="mb-2 mt-4 font-medium text-slate-800 dark:text-slate-200">c. Information from third parties</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Authentication providers:</strong> if you sign in via Google or another OAuth provider through Clerk, we receive basic profile information (name, email).</li>
              <li><strong>Stripe:</strong> subscription status, invoice history, and payment events via webhooks.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              3. How We Use Your Information
            </h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Provide, operate, and improve the Service.</li>
              <li>Create and manage your account and organisation.</li>
              <li>Process payments and manage subscriptions.</li>
              <li>Send transactional emails (account creation, invoices, trial notices, payment alerts).</li>
              <li>Respond to support requests.</li>
              <li>Monitor and enforce usage quotas associated with your subscription plan.</li>
              <li>Detect, investigate, and prevent fraudulent or abusive activity.</li>
              <li>Comply with legal obligations.</li>
              <li>Send product updates and marketing communications where you have consented or where permitted by applicable law (you may opt out at any time).</li>
            </ul>

            <p className="mt-3">
              <strong>Legal bases (GDPR):</strong> We process your personal data on the following legal bases: (i) performance of a contract — to deliver the Service you have subscribed to; (ii) legitimate interests — to improve our Service and prevent fraud; (iii) legal obligation — to comply with applicable law; and (iv) consent — for optional marketing communications and non-essential cookies.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              4. How We Share Your Information
            </h2>
            <p className="mb-2">We do not sell your personal information. We share it only in the following circumstances:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Service providers:</strong> we share data with trusted third parties that help us operate the Service, including Clerk (authentication), Stripe (payments), Supabase (database), Vercel (hosting), Resend (transactional email), Sentry (error monitoring), and OpenAI / Anthropic (AI processing). These providers are contractually bound to use your data only to provide services to us.</li>
              <li><strong>Your team:</strong> organisation owners can see team member names and email addresses within the same organisation.</li>
              <li><strong>Legal requirements:</strong> we may disclose information if required by law, court order, or governmental authority, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
              <li><strong>Business transfers:</strong> if AvidiaTech is acquired or merges with another company, your information may be transferred as part of that transaction. We will notify you via email or a prominent notice on the Service before your data is subject to a different privacy policy.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              5. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide the Service. If you close your account, we will delete or anonymise your personal data within 90 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention, financial records).
            </p>
            <p className="mt-2">
              AI-processed product data (extracted content, descriptions, translations) is retained for the lifetime of your subscription and deleted within 30 days of account closure.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              6. Cookies
            </h2>
            <p className="mb-2">We use the following categories of cookies:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Strictly necessary:</strong> session and authentication cookies set by Clerk. Required for the Service to function. Cannot be disabled.</li>
              <li><strong>Analytics (optional):</strong> we may use privacy-preserving analytics to understand feature usage. These cookies require your consent where applicable law demands it.</li>
            </ul>
            <p className="mt-2">You can manage cookie preferences in your browser settings. Disabling analytics cookies will not affect Service functionality.</p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              7. International Transfers
            </h2>
            <p>
              AvidiaTech operates from the United States. If you access the Service from outside the United States, your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate. These transfers are subject to appropriate safeguards, such as Standard Contractual Clauses approved by the European Commission, where required.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              8. Your Rights
            </h2>
            <p className="mb-2">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> request correction of inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> request deletion of your personal data (&ldquo;right to be forgotten&rdquo;), subject to legal obligations.</li>
              <li><strong>Restriction:</strong> request that we limit how we process your data in certain circumstances.</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interests, including for direct marketing.</li>
              <li><strong>Withdraw consent:</strong> where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing.</li>
            </ul>
            <p className="mt-3">
              <strong>California residents (CCPA/CPRA):</strong> you have the right to know, delete, and opt out of the sale or sharing of your personal information. We do not sell personal information. To exercise your rights, contact{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">privacy@avidiatech.com</a>.
            </p>
            <p className="mt-2">
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">privacy@avidiatech.com</a>. We will respond within 30 days (or as required by applicable law). We may request identity verification before processing your request.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              9. Security
            </h2>
            <p>
              We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest (via Supabase), role-based access controls, and regular security reviews. All authentication is managed by Clerk, which is SOC 2 Type II certified. Despite these measures, no system is completely secure. In the event of a data breach that poses a risk to your rights, we will notify you and relevant authorities as required by law.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              10. Children&rsquo;s Privacy
            </h2>
            <p>
              The Service is intended for business use and is not directed at children under the age of 16. We do not knowingly collect personal data from children. If we learn that we have inadvertently collected data from a child, we will delete it promptly. If you believe a child has provided us with their information, please contact{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">privacy@avidiatech.com</a>.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email (to the address associated with your account) and by posting a prominent notice on the Service at least 14 days before the change takes effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Policy.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              12. Contact Us
            </h2>
            <p>If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us:</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-semibold text-slate-800 dark:text-slate-200">AvidiaTech</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:privacy@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">
                  privacy@avidiatech.com
                </a>
              </p>
              <p className="mt-1">
                Support:{" "}
                <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">
                  support@avidiatech.com
                </a>
              </p>
            </div>
            <p className="mt-3">
              If you are located in the European Economic Area and are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <span>© {new Date().getFullYear()} AvidiaTech. All rights reserved.</span>
          <Link
            href="/legal/terms"
            className="underline underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
