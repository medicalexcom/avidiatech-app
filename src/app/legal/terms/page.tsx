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
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective Date: April 9, 2026 &nbsp;&middot;&nbsp; Last Updated: April 9, 2026
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
            software services provided by <strong>AvidiaTech, Inc.</strong> (&ldquo;AvidiaTech,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), including the web application
            available at{" "}
            <a
              href="https://app.avidiatech.com"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              app.avidiatech.com
            </a>{" "}
            and the marketing website at{" "}
            <a
              href="https://avidiatech.com"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              avidiatech.com
            </a>{" "}
            (collectively, the &ldquo;Service&rdquo;). Please read these Terms carefully before using
            the Service.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-7 text-slate-700 dark:text-slate-300">

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account, accessing, or using the Service in any way, you agree to be
              bound by these Terms and our{" "}
              <a href="/legal/privacy" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                Privacy Policy
              </a>
              , which is incorporated herein by reference. If you are using the Service on behalf of
              a company or other legal entity (&ldquo;Organization&rdquo;), you represent and warrant
              that you have the authority to bind that Organization to these Terms, in which case
              &ldquo;you&rdquo; refers to both the individual and the Organization.
            </p>
            <p className="mt-3">
              If you do not agree to these Terms, you must not access or use the Service. Your
              continued use of the Service after any modification to these Terms constitutes your
              acceptance of the revised Terms.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              2. Description of the Service
            </h2>
            <p>
              AvidiaTech provides a cloud-based, AI-powered product data automation platform designed
              for eCommerce businesses. The Service includes, but is not limited to, the following
              capabilities:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Data Extraction &amp; Ingestion:</strong> Automated extraction of product
                information from supplier files, URLs, and structured data sources into a normalized
                format.
              </li>
              <li>
                <strong>AI-Generated Content:</strong> AI-assisted generation of product titles,
                descriptions, bullet points, and other copy optimized for eCommerce storefronts.
              </li>
              <li>
                <strong>SEO Optimization:</strong> Automated generation and scoring of SEO metadata
                including meta titles, meta descriptions, and keyword enrichment for product
                listings.
              </li>
              <li>
                <strong>Variant &amp; Attribute Management:</strong> Structured processing and
                normalization of product variants, attributes, and specifications at scale.
              </li>
              <li>
                <strong>Bulk Processing &amp; Pipeline Jobs:</strong> High-volume batch processing
                of product catalogs with configurable pipeline stages and job queuing.
              </li>
              <li>
                <strong>Platform Integrations:</strong> Native integrations with third-party
                eCommerce platforms including Shopify, BigCommerce, and WooCommerce to enable
                direct product publishing and catalog synchronization.
              </li>
              <li>
                <strong>Product Matching:</strong> AI-assisted deduplication and matching of
                products across catalogs and data sources.
              </li>
              <li>
                <strong>Monitoring &amp; Analytics:</strong> Dashboards and reporting tools to
                track pipeline health, job status, data quality metrics, and usage.
              </li>
              <li>
                <strong>Import &amp; Export:</strong> Tooling to import product data via CSV,
                spreadsheet, API, or direct integration, and to export enriched data in standard
                formats.
              </li>
            </ul>
            <p className="mt-3">
              The Service is intended for use by businesses and professionals. AvidiaTech reserves
              the right to modify, suspend, or discontinue any feature or aspect of the Service at
              any time, with reasonable advance notice where practicable.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              3. User Accounts and Authentication
            </h2>
            <p>
              Access to the Service requires creation of an account. Account authentication is
              managed through Clerk, our third-party identity provider. By creating an account, you
              agree to provide accurate, current, and complete information and to keep your account
              information updated.
            </p>
            <p className="mt-3">
              You are solely responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account. You agree to notify
              us immediately at{" "}
              <a href="mailto:support@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                support@avidiatech.com
              </a>{" "}
              if you suspect any unauthorized use of your account or any other security breach.
            </p>
            <p className="mt-3">
              AvidiaTech will not be liable for any loss or damage arising from your failure to
              protect your account credentials. You may not share your account with others, transfer
              your account to any other person, or use another person&rsquo;s account without
              authorization.
            </p>
            <p className="mt-3">
              If you are accessing the Service as part of an Organization, your account may be
              subject to the Organization&rsquo;s policies and controls. AvidiaTech is not
              responsible for access provisioning decisions made by an Organization administrator.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              4. Subscription Plans and Billing
            </h2>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.1 Subscription Plans
            </h3>
            <p>
              The Service is offered on a subscription basis. AvidiaTech offers multiple subscription
              tiers, each with defined usage quotas for features including but not limited to product
              ingestion, SEO generation, variant processing, and product matching. Details of
              available plans, pricing, and quotas are published at{" "}
              <a href="https://avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                avidiatech.com
              </a>{" "}
              and within the application, and are subject to change as described in Section 14.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.2 Billing and Payment
            </h3>
            <p>
              All payments are processed by Stripe, our third-party payment processor. By providing
              payment information, you authorize AvidiaTech and Stripe to charge your designated
              payment method for all applicable fees. You represent and warrant that you are
              authorized to use the payment method you provide.
            </p>
            <p className="mt-3">
              Subscription fees are billed in advance on a recurring basis (monthly or annually,
              depending on the plan you select). All amounts are stated and charged in US dollars
              unless otherwise specified. You are responsible for all applicable taxes.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.3 Free Trials
            </h3>
            <p>
              AvidiaTech may offer free trial periods for paid subscription plans. At the end of a
              free trial, your account will automatically convert to the applicable paid plan and
              your payment method will be charged unless you cancel before the trial period ends.
              AvidiaTech reserves the right to determine trial eligibility and to discontinue trial
              offers at any time.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.4 Auto-Renewal
            </h3>
            <p>
              Subscriptions automatically renew at the end of each billing period unless cancelled
              prior to the renewal date. You may cancel auto-renewal at any time through your account
              settings or by contacting{" "}
              <a href="mailto:support@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                support@avidiatech.com
              </a>
              . Cancellation takes effect at the end of the current billing period; you will
              continue to have access to the Service through that date.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.5 Refund Policy
            </h3>
            <p>
              Subscription fees are generally non-refundable. AvidiaTech does not provide refunds or
              credits for partial subscription periods, unused features, or downgraded plans, except
              where required by applicable law or at AvidiaTech&rsquo;s sole discretion. If you
              believe a charge was made in error, you must contact us within 30 days of the charge
              at{" "}
              <a href="mailto:support@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                support@avidiatech.com
              </a>
              .
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.6 Price Changes
            </h3>
            <p>
              AvidiaTech reserves the right to modify subscription pricing at any time. We will
              provide at least 30 days&rsquo; advance notice of any price increase applicable to your
              current plan, via email or in-app notification. Your continued use of the Service after
              the price change takes effect constitutes your acceptance of the new pricing.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              4.7 Late Payments and Suspension
            </h3>
            <p>
              If payment cannot be collected on the billing date, AvidiaTech may retry the charge
              and may suspend access to the Service until payment is received. Accounts with
              outstanding balances for more than 30 days may be terminated in accordance with
              Section 12.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              5. Usage Quotas and Fair Use
            </h2>
            <p>
              Each subscription plan includes defined usage quotas (e.g., number of products
              ingested per month, SEO generations, variant records processed, matching operations).
              These quotas reset on your monthly billing cycle date unless otherwise specified.
            </p>
            <p className="mt-3">
              If you exceed your plan&rsquo;s quota limits, AvidiaTech may: (a) automatically
              suspend processing for that quota category until the next reset period; (b) prompt you
              to upgrade your plan; or (c) charge overage fees at rates disclosed in your plan
              documentation, if applicable.
            </p>
            <p className="mt-3">
              You agree to use the Service in a manner consistent with your plan&rsquo;s intended
              scope. Artificially inflating usage, circumventing quota limits through technical
              means, or sharing access credentials across multiple organizations to consolidate usage
              under a single account constitutes a violation of these Terms.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              6. Acceptable Use Policy
            </h2>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these
              Terms. You must not use the Service to:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                Violate any applicable local, state, national, or international law or regulation.
              </li>
              <li>
                Scrape, crawl, or systematically extract data from third-party websites in violation
                of those websites&rsquo; terms of service or applicable law, or use the Service as
                a tool to facilitate such activity.
              </li>
              <li>
                Upload, transmit, or process any content that is unlawful, defamatory, obscene,
                fraudulent, or that infringes on any third party&rsquo;s intellectual property,
                privacy, or other rights.
              </li>
              <li>
                Conduct or facilitate automated attacks, including denial-of-service attacks,
                credential stuffing, brute force attacks, or any other activity that degrades the
                performance or availability of the Service for other users.
              </li>
              <li>
                Reverse engineer, decompile, disassemble, or attempt to derive the source code or
                underlying algorithms of the Service, except to the extent permitted by applicable
                law.
              </li>
              <li>
                Use the Service to build a competing product or service, or to benchmark the Service
                for competitive purposes without AvidiaTech&rsquo;s prior written consent.
              </li>
              <li>
                Introduce malware, viruses, trojans, worms, or other malicious or harmful code into
                the Service.
              </li>
              <li>
                Impersonate any person or entity, or misrepresent your affiliation with any person
                or entity.
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Service, other accounts,
                computer systems, or networks connected to the Service.
              </li>
              <li>
                Use the Service to process or store any information that is subject to the Health
                Insurance Portability and Accountability Act (HIPAA), the Gramm-Leach-Bliley Act
                (GLBA), or other regulatory frameworks requiring special data handling, unless you
                have entered into a separate written agreement with AvidiaTech addressing such
                requirements.
              </li>
            </ul>
            <p className="mt-3">
              AvidiaTech reserves the right to investigate and take appropriate action against any
              violation of this Acceptable Use Policy, including suspending or terminating your
              account, reporting violations to law enforcement, and pursuing civil remedies.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              7. Intellectual Property
            </h2>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              7.1 AvidiaTech&rsquo;s Intellectual Property
            </h3>
            <p>
              The Service, including all software, algorithms, AI models, user interfaces, designs,
              text, graphics, logos, and other content developed by AvidiaTech, is and remains the
              exclusive property of AvidiaTech, Inc. and its licensors. These Terms do not grant
              you any ownership rights in the Service. All rights not expressly granted herein are
              reserved by AvidiaTech.
            </p>
            <p className="mt-3">
              &ldquo;AvidiaTech,&rdquo; the AvidiaTech logo, and any other product or service names,
              logos, or slogans displayed through the Service are trademarks or service marks of
              AvidiaTech, Inc. You may not use these marks without AvidiaTech&rsquo;s prior written
              permission.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              7.2 License to Use the Service
            </h3>
            <p>
              Subject to your compliance with these Terms and payment of applicable fees, AvidiaTech
              grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable
              license to access and use the Service during your subscription term solely for your
              internal business purposes.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              7.3 Your Content and Product Data
            </h3>
            <p>
              You retain full ownership of all product data, files, images, text, and other content
              that you upload, submit, or otherwise provide to the Service (&ldquo;Your
              Content&rdquo;). By submitting Your Content to the Service, you grant AvidiaTech a
              limited, non-exclusive, worldwide license to access, process, store, and use Your
              Content solely as necessary to provide the Service to you.
            </p>
            <p className="mt-3">
              AvidiaTech does not claim any ownership rights in Your Content. You are solely
              responsible for ensuring that Your Content does not infringe the rights of any third
              party and that you have all necessary rights and permissions to submit it to the
              Service.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              7.4 AI-Generated Output
            </h3>
            <p>
              Content generated by the Service&rsquo;s AI features (e.g., product descriptions, SEO
              metadata) in response to Your Content (&ldquo;Generated Output&rdquo;) is provided to
              you for your use. To the extent permitted by applicable law, AvidiaTech assigns any
              rights it may have in Generated Output to you. You are solely responsible for
              reviewing, editing, and validating Generated Output before use, and AvidiaTech makes
              no representations or warranties regarding the accuracy, originality, or fitness of
              Generated Output for any particular purpose.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              7.5 Feedback
            </h3>
            <p>
              If you provide AvidiaTech with suggestions, ideas, enhancement requests, feedback, or
              other information relating to the Service (&ldquo;Feedback&rdquo;), you hereby assign
              to AvidiaTech all rights in such Feedback, and AvidiaTech may use and incorporate it
              into the Service without restriction or compensation to you.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              8. Data Ownership and Export Rights
            </h2>
            <p>
              You own your data. AvidiaTech processes Your Content only to provide and improve the
              Service as described in these Terms and our Privacy Policy.
            </p>
            <p className="mt-3">
              You may export Your Content and any enriched product data from the Service at any
              time during your active subscription using the export tools available within the
              application. Exported data is provided in standard formats (e.g., CSV, JSON).
            </p>
            <p className="mt-3">
              Upon termination or expiration of your subscription, AvidiaTech will retain your data
              for a period of 30 days, during which you may request an export. After this period,
              AvidiaTech may delete your data in accordance with our data retention practices
              described in the Privacy Policy. AvidiaTech is not responsible for any data loss
              following this retention period.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              9. Service Availability and SLA
            </h2>
            <p>
              AvidiaTech will use commercially reasonable efforts to make the Service available
              24 hours a day, 7 days a week, excluding planned maintenance windows and circumstances
              beyond our reasonable control. We target high availability but do not guarantee any
              specific uptime percentage unless a separate Service Level Agreement (&ldquo;SLA&rdquo;)
              is included in your written contract with AvidiaTech.
            </p>
            <p className="mt-3">
              AvidiaTech may perform scheduled maintenance that results in temporary unavailability.
              We will endeavor to provide advance notice of planned downtime via the Service or by
              email where reasonably practicable.
            </p>
            <p className="mt-3">
              The Service may be subject to limitations, delays, and other problems inherent in the
              use of internet communications, cloud infrastructure, and third-party services.
              AvidiaTech is not responsible for any delays, delivery failures, or other damage
              resulting from such issues.
            </p>
            <p className="mt-3">
              AvidiaTech reserves the right to modify, suspend, or discontinue the Service (or any
              part thereof) at any time. In the event of a permanent discontinuation of the Service,
              AvidiaTech will provide at least 60 days&rsquo; advance notice and will provide
              reasonable tools to facilitate data export.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              10. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY
              APPLICABLE LAW, AVIDIATECH DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
              BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p className="mt-3">
              AVIDIATECH DOES NOT WARRANT THAT: (A) THE SERVICE WILL MEET YOUR REQUIREMENTS;
              (B) THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) THE RESULTS
              OBTAINED FROM USE OF THE SERVICE WILL BE ACCURATE, COMPLETE, OR RELIABLE; OR (D) ANY
              ERRORS IN THE SERVICE WILL BE CORRECTED. AI-GENERATED OUTPUT IS PROVIDED FOR
              INFORMATIONAL AND PRODUCTIVITY PURPOSES AND SHOULD NOT BE RELIED UPON WITHOUT
              INDEPENDENT REVIEW.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              11. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AVIDIATECH, INC.,
              ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS
              INTERRUPTION, OR THE COST OF SUBSTITUTE SERVICES, EVEN IF AVIDIATECH HAS BEEN ADVISED
              OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AVIDIATECH&rsquo;S AGGREGATE
              LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE
              SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNTS PAID BY YOU TO
              AVIDIATECH IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM; OR (B) ONE
              HUNDRED US DOLLARS ($100).
            </p>
            <p className="mt-3">
              THE LIMITATIONS OF LIABILITY IN THIS SECTION SHALL APPLY REGARDLESS OF THE THEORY OF
              LIABILITY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF
              AVIDIATECH HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH LOSS OR DAMAGE. SOME
              JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR CONSEQUENTIAL
              DAMAGES; IN SUCH JURISDICTIONS, AVIDIATECH&rsquo;S LIABILITY IS LIMITED TO THE MAXIMUM
              EXTENT PERMITTED BY LAW.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              12. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless AvidiaTech, Inc. and its officers,
              directors, employees, contractors, agents, licensors, and suppliers from and against
              any claims, liabilities, damages, losses, costs, and expenses (including reasonable
              attorneys&rsquo; fees) arising out of or relating to: (a) your use of or access to
              the Service; (b) Your Content; (c) your violation of these Terms; (d) your violation
              of any applicable law, rule, or regulation; or (e) your violation of any rights of
              a third party.
            </p>
            <p className="mt-3">
              AvidiaTech reserves the right to assume the exclusive defense and control of any
              matter subject to indemnification by you, in which case you agree to cooperate with
              AvidiaTech&rsquo;s defense of such claim.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              13. Termination
            </h2>
            <p>
              Either party may terminate these Terms and your access to the Service at any time.
            </p>
            <p className="mt-3">
              <strong>Termination by you:</strong> You may cancel your subscription and terminate
              your account at any time through your account settings or by contacting{" "}
              <a href="mailto:support@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                support@avidiatech.com
              </a>
              . Cancellation will take effect at the end of your current billing period. No refunds
              will be issued for unused time in the current period.
            </p>
            <p className="mt-3">
              <strong>Termination by AvidiaTech:</strong> AvidiaTech may suspend or terminate your
              access to the Service immediately, with or without notice, if: (a) you breach these
              Terms; (b) AvidiaTech is required to do so by law; (c) your account has an
              outstanding unpaid balance for more than 30 days; or (d) AvidiaTech determines, in
              its sole discretion, that continuing to provide the Service to you is not commercially
              viable.
            </p>
            <p className="mt-3">
              Upon termination for any reason: (a) all licenses granted to you under these Terms
              will immediately terminate; (b) you must cease all use of the Service; and (c)
              Sections 7.1, 7.5, 8 (data export window), 10, 11, 12, 14, 15, and 16 will survive
              termination.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              14. Governing Law and Dispute Resolution
            </h2>
            <p>
              These Terms and any dispute or claim arising out of or in connection with them or their
              subject matter shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States of America, without regard to its conflict of law
              provisions.
            </p>
            <p className="mt-3">
              You and AvidiaTech agree to submit to the exclusive jurisdiction of the state and
              federal courts located in Delaware for the resolution of any disputes not subject to
              arbitration. Each party waives any objection to personal jurisdiction or venue in
              such courts.
            </p>
            <p className="mt-3">
              <strong>Informal Resolution:</strong> Before initiating formal proceedings, you agree
              to contact AvidiaTech at{" "}
              <a href="mailto:legal@avidiatech.com" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
                legal@avidiatech.com
              </a>{" "}
              and attempt to resolve the dispute informally. AvidiaTech will have 30 days to respond
              and attempt resolution before formal proceedings may be initiated.
            </p>
            <p className="mt-3">
              <strong>Class Action Waiver:</strong> To the extent permitted by law, you and
              AvidiaTech agree that each may bring claims against the other only in your or its
              individual capacity and not as a plaintiff or class member in any purported class or
              representative proceeding.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              15. Changes to These Terms
            </h2>
            <p>
              AvidiaTech reserves the right to modify these Terms at any time. If we make material
              changes, we will provide notice via email to the address associated with your account
              or through a prominent notice within the Service at least 14 days before the changes
              take effect. For non-material changes, we may update the Terms without separate notice,
              and the updated version will be effective upon posting.
            </p>
            <p className="mt-3">
              Your continued use of the Service after the effective date of any revised Terms
              constitutes your acceptance of the changes. If you do not agree to the revised Terms,
              you must stop using the Service before the effective date.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              16. General Provisions
            </h2>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.1 Entire Agreement
            </h3>
            <p>
              These Terms, together with the Privacy Policy and any additional agreements you enter
              into with AvidiaTech, constitute the entire agreement between you and AvidiaTech with
              respect to the Service and supersede all prior or contemporaneous agreements,
              representations, and understandings.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.2 Severability
            </h3>
            <p>
              If any provision of these Terms is found to be invalid, illegal, or unenforceable,
              the remaining provisions will continue in full force and effect, and the invalid
              provision will be modified to the minimum extent necessary to make it enforceable.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.3 Waiver
            </h3>
            <p>
              AvidiaTech&rsquo;s failure to enforce any right or provision of these Terms will not
              be considered a waiver of that right or provision. Any waiver of any provision of
              these Terms will be effective only if in writing and signed by AvidiaTech.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.4 Assignment
            </h3>
            <p>
              You may not assign or transfer your rights or obligations under these Terms without
              AvidiaTech&rsquo;s prior written consent. AvidiaTech may freely assign these Terms,
              including in connection with a merger, acquisition, or sale of assets.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.5 Force Majeure
            </h3>
            <p>
              AvidiaTech will not be liable for any failure or delay in performance resulting from
              causes beyond its reasonable control, including acts of God, natural disasters,
              pandemics, war, terrorism, labor disputes, governmental actions, or failures of
              third-party infrastructure providers.
            </p>

            <h3 className="mb-2 mt-5 font-semibold text-slate-800 dark:text-slate-200">
              16.6 No Third-Party Beneficiaries
            </h3>
            <p>
              These Terms are for the benefit of AvidiaTech and you only. Nothing in these Terms
              creates any right or benefit in any third party.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
              17. Contact Information
            </h2>
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-slate-900 dark:text-slate-50">AvidiaTech, Inc.</p>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                General &amp; Support:{" "}
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
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AvidiaTech, Inc. All rights reserved.{" "}
            <a href="/legal/privacy" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}