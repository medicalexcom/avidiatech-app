export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective Date: April 9, 2026 &nbsp;&middot;&nbsp; Last Updated: April 9, 2026
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            This Privacy Policy explains how <strong>AvidiaTech, Inc.</strong> (&ldquo;AvidiaTech,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, and
            discloses information when you access or use our web application at{" "}
            <a
              href="https://app.avidiatech.com"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              app.avidiatech.com
            </a>{" "}
            and our marketing website at{" "}
            <a
              href="https://avidiatech.com"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              avidiatech.com
            </a>{" "}
            (collectively, the &ldquo;Service&rdquo;). This Policy also describes your rights
            regarding your personal data and how to exercise them.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            By using the Service, you acknowledge that you have read and understand this Privacy
            Policy. If you do not agree with this Policy, please do not use the Service.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-7 text-slate-700 dark:text-slate-300">

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              1. Who This Policy Applies To
            </h2>
            <p>
              This Privacy Policy applies to all users of the Service, including individuals who
              access the Service on behalf of a business or organization (&ldquo;Users&rdquo;).
              Because AvidiaTech is a business-to-business (B2B) SaaS platform, the data we collect
              and process is primarily related to business operations, product catalogs, and
              professional account information rather than consumer personal data.
            </p>
            <p className="mt-3">
              If you are a resident of the European Economic Area (EEA), the United Kingdom, or
              California, additional rights and disclosures applicable to you are described in
              Sections 13, 14, and 15 respectively.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              2. Information We Collect
            </h2>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.1 Account and Identity Information
            </h3>
            <p>
              When you register for or sign in to the Service, we collect account information
              through Clerk, our identity and authentication provider. This includes:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Name and email address</li>
              <li>Authentication credentials (managed and stored by Clerk; AvidiaTech does not store raw passwords)</li>
              <li>Profile information you optionally provide (e.g., company name, job title)</li>
              <li>OAuth tokens if you authenticate via a third-party provider (e.g., Google)</li>
            </ul>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.2 Product Data You Submit
            </h3>
            <p>
              The Service is designed to process product catalog data. When you use the Service,
              you may submit or import:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Product titles, descriptions, images, and specifications</li>
              <li>Supplier data files, CSVs, and structured product feeds</li>
              <li>URLs or data sources from which you direct the Service to extract product information</li>
              <li>Variant, attribute, and inventory data</li>
              <li>Integration credentials for platforms such as Shopify, BigCommerce, and WooCommerce (stored in encrypted form)</li>
            </ul>
            <p className="mt-3">
              This data is your business content (&ldquo;Your Content&rdquo;) and is governed by
              Section 7 of our Terms of Service. You retain ownership of Your Content at all times.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.3 Billing and Payment Information
            </h3>
            <p>
              Subscription billing is managed through Stripe, our payment processor. When you
              subscribe to a paid plan, Stripe collects and stores your payment method details
              (e.g., credit card number, expiry, billing address). AvidiaTech receives only
              limited, non-sensitive payment metadata from Stripe, such as the last four digits of
              your card, card type, billing country, and transaction status. AvidiaTech does not
              store full payment card details on its own infrastructure.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.4 Usage and Analytics Data
            </h3>
            <p>
              We automatically collect data about how you interact with the Service, including:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Pages visited, features used, and actions taken within the application</li>
              <li>Job and pipeline execution logs (task types, durations, success/failure status)</li>
              <li>Quota consumption (number of ingestion jobs, SEO generations, variant records processed, etc.)</li>
              <li>Search queries and filter interactions within the product catalog UI</li>
              <li>Error reports and crash diagnostics</li>
            </ul>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.5 Technical and Device Information
            </h3>
            <p>
              We collect standard technical information when you access the Service, including:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>IP address and approximate geographic location (country/region level)</li>
              <li>Browser type and version, operating system</li>
              <li>Referring URLs and exit pages</li>
              <li>Timestamps of access and session duration</li>
            </ul>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              2.6 Communications
            </h3>
            <p>
              If you contact us for support, submit a form, or communicate with us by email, we
              retain those communications including your contact information and the content of
              your messages for the purpose of responding and improving our support.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>To provide and operate the Service:</strong> Processing your product data
                through AI pipelines, generating descriptions and SEO content, running bulk jobs,
                managing integrations, and delivering all features of the platform.
              </li>
              <li>
                <strong>To manage your account and subscription:</strong> Creating and maintaining
                your account, authenticating your identity via Clerk, processing billing through
                Stripe, and communicating about your plan and usage.
              </li>
              <li>
                <strong>To improve the Service:</strong> Analyzing aggregated, de-identified usage
                patterns to understand how the platform is used, identify areas for improvement,
                and develop new features. This analysis uses aggregate metrics, not your individual
                product content.
              </li>
              <li>
                <strong>To ensure security and prevent abuse:</strong> Monitoring for unauthorized
                access, fraud, misuse, and violations of our Terms of Service; enforcing rate
                limits and quota controls.
              </li>
              <li>
                <strong>To communicate with you:</strong> Sending transactional emails (account
                confirmations, billing receipts, usage alerts), product update notifications, and
                responding to support requests. We do not send unsolicited marketing emails without
                your consent.
              </li>
              <li>
                <strong>To comply with legal obligations:</strong> Retaining records as required by
                law, responding to lawful legal process, and exercising or defending legal claims.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              4. AI Model Training — Important Disclosure
            </h2>
            <p>
              AvidiaTech uses AI models to power features such as product description generation,
              SEO optimization, and data extraction. We want to be transparent about how your data
              relates to these AI systems:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <strong>Your product data is not used to train shared AI models without your explicit consent.</strong>{" "}
                The product data you upload or generate through the Service is used solely to provide
                the Service to you. It is not ingested into any shared model training pipeline that
                would benefit other customers.
              </li>
              <li>
                AI inference on your product data is performed by AvidiaTech&rsquo;s systems and,
                where applicable, by OpenAI&rsquo;s API (see Section 6). OpenAI processes this data
                as a sub-processor in accordance with their API data usage policies, which include
                commitments that API inputs are not used to train OpenAI&rsquo;s general models.
              </li>
              <li>
                AvidiaTech may use aggregated, anonymized metrics (e.g., job completion rates, error
                patterns) — not individual product content — to evaluate and improve the performance
                of its pipeline infrastructure and prompting systems.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              5. Data Storage and Infrastructure
            </h2>
            <p>
              AvidiaTech&rsquo;s primary data infrastructure is built on Supabase (PostgreSQL),
              hosted on AWS infrastructure. Data is stored in the United States by default, with
              certain users or plan tiers having the option of EU-region data residency where
              available.
            </p>
            <p className="mt-3">
              Our infrastructure providers maintain SOC 2 Type II compliance, encryption at rest
              (AES-256), and encryption in transit (TLS 1.2+). AvidiaTech implements access
              controls, audit logging, and security monitoring consistent with industry standards
              for cloud SaaS platforms.
            </p>
            <p className="mt-3">
              Integration credentials for third-party eCommerce platforms (e.g., Shopify API keys,
              BigCommerce tokens) are stored in encrypted form and are accessible only by the
              Service systems that require them to perform authorized integration tasks on your
              behalf.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              6. Third-Party Processors and Sub-Processors
            </h2>
            <p>
              AvidiaTech engages third-party service providers (&ldquo;sub-processors&rdquo;) to
              help deliver the Service. Each sub-processor is bound by contractual obligations to
              protect your data in a manner consistent with this Privacy Policy. Our current key
              sub-processors include:
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Provider</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Data Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">Clerk</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Authentication &amp; identity</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Name, email, credentials, session tokens</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">Stripe</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Payment processing &amp; billing</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Payment method details, billing address, transaction records</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">Supabase / AWS</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Database &amp; cloud infrastructure</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">All application data including product content and user records</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">OpenAI</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">AI inference for content generation</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Product data submitted for AI processing features (not used for model training)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We do not sell your data to third parties, and we do not share your data with
              third parties for their own marketing or advertising purposes.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              7. Cookies and Session Management
            </h2>
            <p>
              The Service uses cookies and similar session technologies to operate correctly and
              provide a consistent user experience. Specifically:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Session cookies:</strong> Used by Clerk to manage authenticated sessions.
                These are essential for the Service to function and cannot be disabled while
                using the application.
              </li>
              <li>
                <strong>Preference cookies:</strong> Used to store UI preferences such as dark mode
                settings. These are stored in your browser&rsquo;s local storage.
              </li>
              <li>
                <strong>Analytics cookies:</strong> If we use analytics tooling, minimal telemetry
                data may be collected via first-party or privacy-respecting third-party analytics.
                These do not include advertising trackers.
              </li>
            </ul>
            <p className="mt-3">
              We do not use third-party advertising cookies, cross-site tracking pixels, or
              behavioral targeting technologies. You may clear cookies through your browser settings
              at any time, though doing so may log you out of the Service.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              8. Data Retention and Deletion
            </h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide
              the Service. Specific retention practices:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Active accounts:</strong> Your product data, job history, and account
                information are retained for the duration of your subscription and made available
                to you through the Service.
              </li>
              <li>
                <strong>After cancellation:</strong> Following subscription cancellation or
                expiration, your data is retained for 30 days to allow for data export. After
                this window, your data may be permanently deleted from production systems.
              </li>
              <li>
                <strong>Backups:</strong> Data may persist in encrypted backup systems for up to
                90 days following deletion from production systems, after which it is purged from
                backups as well.
              </li>
              <li>
                <strong>Billing records:</strong> Payment and transaction records are retained
                for a minimum of 7 years as required by applicable financial recordkeeping laws.
              </li>
              <li>
                <strong>Legal holds:</strong> Data subject to a legal hold or regulatory
                investigation may be retained beyond standard retention periods as required.
              </li>
            </ul>
            <p className="mt-3">
              You may request deletion of your account and associated data at any time by contacting{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>
              . We will process deletion requests within 30 days, subject to applicable legal
              obligations.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              9. Your Rights and Choices
            </h2>
            <p>
              Regardless of your location, AvidiaTech provides you with the following rights with
              respect to your personal data:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Access:</strong> You may request a copy of the personal data we hold about
                you, including account information and usage records.
              </li>
              <li>
                <strong>Correction:</strong> You may update or correct inaccurate personal data
                through your account settings or by contacting us.
              </li>
              <li>
                <strong>Export:</strong> You may export your product data and enriched catalog
                content at any time using the export tools within the Service.
              </li>
              <li>
                <strong>Deletion:</strong> You may request deletion of your account and personal
                data, subject to our retention obligations described in Section 8.
              </li>
              <li>
                <strong>Portability:</strong> Where technically feasible, we will provide your
                data in a structured, machine-readable format upon request.
              </li>
              <li>
                <strong>Objection to processing:</strong> You may object to certain uses of your
                data where we rely on legitimate interests as our legal basis.
              </li>
              <li>
                <strong>Marketing communications:</strong> You may opt out of non-transactional
                email communications at any time using the unsubscribe link in those emails or by
                contacting us.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>
              . We will respond to all verifiable requests within 30 days. We may need to verify
              your identity before processing a request.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              10. Data Security
            </h2>
            <p>
              AvidiaTech implements technical and organizational measures designed to protect your
              data against unauthorized access, disclosure, alteration, and destruction. These
              measures include:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Encryption of data in transit using TLS 1.2 or higher</li>
              <li>Encryption of data at rest using AES-256</li>
              <li>Role-based access controls limiting employee access to customer data</li>
              <li>SOC 2-compliant cloud infrastructure</li>
              <li>Audit logging of access to sensitive data</li>
              <li>Encrypted storage of third-party API credentials</li>
              <li>Regular review of security practices and access permissions</li>
            </ul>
            <p className="mt-3">
              No method of data transmission or storage is 100% secure. If you discover or suspect
              a security vulnerability or incident involving the Service, please report it
              immediately to{" "}
              <a href="mailto:legal@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                legal@avidiatech.com
              </a>
              .
            </p>
            <p className="mt-3">
              In the event of a data breach that affects your personal data, AvidiaTech will notify
              affected users in accordance with applicable data breach notification laws.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              11. International Data Transfers
            </h2>
            <p>
              AvidiaTech is headquartered in the United States. If you access the Service from
              outside the United States, your data will be transferred to and processed in the
              United States. The United States may not have data protection laws equivalent to
              those in your country.
            </p>
            <p className="mt-3">
              For users in the EEA, UK, or Switzerland, AvidiaTech relies on appropriate legal
              transfer mechanisms for cross-border data transfers, including Standard Contractual
              Clauses (SCCs) as approved by the European Commission where applicable. Sub-processors
              used by AvidiaTech are subject to equivalent transfer safeguards.
            </p>
            <p className="mt-3">
              EU-region data residency may be available on certain plans. Contact us at{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>{" "}
              for more information.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              12. Children&rsquo;s Privacy
            </h2>
            <p>
              The Service is intended for use by businesses and professionals. It is not directed
              at or intended for use by individuals under the age of 18. AvidiaTech does not
              knowingly collect personal data from anyone under 18 years of age. If you believe a
              minor has provided us with personal data, please contact us at{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>{" "}
              and we will take steps to delete that information.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              13. GDPR — Rights of EU, EEA, and UK Users
            </h2>
            <p>
              If you are located in the European Union, European Economic Area, or the United
              Kingdom, the General Data Protection Regulation (GDPR) or UK GDPR applies to our
              processing of your personal data. This section supplements the rights described in
              Section 9.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              Legal Bases for Processing
            </h3>
            <p>We process your personal data on the following legal bases:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Contract performance:</strong> Processing necessary to provide the Service
                you have subscribed to (e.g., account management, running AI jobs on your data,
                billing).
              </li>
              <li>
                <strong>Legitimate interests:</strong> Processing for security monitoring, abuse
                prevention, aggregated analytics to improve the Service, and direct communications
                about product features, where our interests are not overridden by your rights.
              </li>
              <li>
                <strong>Legal obligation:</strong> Processing required to comply with applicable
                laws (e.g., financial recordkeeping, responding to lawful legal process).
              </li>
              <li>
                <strong>Consent:</strong> Where we request your consent for optional processing
                (e.g., marketing emails), you may withdraw consent at any time without affecting
                the lawfulness of processing before withdrawal.
              </li>
            </ul>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              Additional GDPR Rights
            </h3>
            <p>In addition to the rights in Section 9, GDPR users have the right to:</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Restriction of processing:</strong> Request that we restrict processing of
                your personal data in certain circumstances.
              </li>
              <li>
                <strong>Lodge a complaint:</strong> File a complaint with your local data protection
                authority (DPA) if you believe we have processed your data in violation of
                applicable law.
              </li>
            </ul>
            <p className="mt-3">
              AvidiaTech acts as a <strong>data controller</strong> with respect to account and
              usage data, and as a <strong>data processor</strong> with respect to product data you
              submit through the Service. If you require a Data Processing Agreement (DPA) for
              GDPR compliance purposes, please contact{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>
              .
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              14. CCPA — Rights of California Residents
            </h2>
            <p>
              If you are a California resident, the California Consumer Privacy Act (CCPA), as
              amended by the California Privacy Rights Act (CPRA), provides you with additional
              rights regarding your personal information.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              Categories of Personal Information Collected
            </h3>
            <p>
              In the preceding 12 months, AvidiaTech has collected the following categories of
              personal information, as defined under the CCPA:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Identifiers (name, email address, IP address, account ID)</li>
              <li>Commercial information (subscription plan, transaction history)</li>
              <li>Internet or other electronic network activity (usage logs, feature interactions)</li>
              <li>Professional or employment-related information (company name, job title, if provided)</li>
            </ul>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              Sale or Sharing of Personal Information
            </h3>
            <p>
              AvidiaTech does <strong>not</strong> sell your personal information to third parties,
              and does not share your personal information with third parties for cross-context
              behavioral advertising purposes.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              Your CCPA Rights
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Right to Know:</strong> You may request disclosure of the categories and
                specific pieces of personal information we have collected about you.
              </li>
              <li>
                <strong>Right to Delete:</strong> You may request deletion of personal information
                we have collected, subject to certain exceptions.
              </li>
              <li>
                <strong>Right to Correct:</strong> You may request correction of inaccurate personal
                information.
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> We will not discriminate against you
                for exercising your CCPA rights.
              </li>
            </ul>
            <p className="mt-3">
              To exercise your CCPA rights, contact us at{" "}
              <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                privacy@avidiatech.com
              </a>
              . We will verify your identity before responding to requests.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              15. Links to Third-Party Services
            </h2>
            <p>
              The Service may contain links to or integrations with third-party websites and
              services (e.g., Shopify, BigCommerce, WooCommerce, supplier portals). This Privacy
              Policy does not apply to those third-party services. We encourage you to review the
              privacy policies of any third-party services you use in connection with the Service.
              AvidiaTech is not responsible for the privacy practices of third-party services.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              16. Changes to This Privacy Policy
            </h2>
            <p>
              AvidiaTech may update this Privacy Policy from time to time. If we make material
              changes, we will notify you via email or through a prominent notice within the Service
              at least 14 days before the changes take effect. The &ldquo;Last Updated&rdquo; date
              at the top of this Policy reflects the most recent revision.
            </p>
            <p className="mt-3">
              Your continued use of the Service after the effective date of a revised Privacy Policy
              constitutes your acceptance of the changes. If you do not agree with the revised
              Policy, you must discontinue use of the Service.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              17. Contact Us
            </h2>
            <p>
              For privacy-related questions, requests, or complaints — including Data Processing
              Agreement requests, data subject access requests, or GDPR/CCPA inquiries — please
              contact us:
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-slate-900 dark:text-slate-50">AvidiaTech, Inc.</p>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Privacy inquiries:{" "}
                <a href="mailto:privacy@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                  privacy@avidiatech.com
                </a>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                General support:{" "}
                <a href="mailto:support@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                  support@avidiatech.com
                </a>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Legal matters:{" "}
                <a href="mailto:legal@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                  legal@avidiatech.com
                </a>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Website:{" "}
                <a href="https://avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                  avidiatech.com
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-14 border-t border-slate-200 pt-6 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} AvidiaTech, Inc. All rights reserved.{" "}
            <a href="/legal/terms" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
