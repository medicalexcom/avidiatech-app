import Link from "next/link";

const featureSections = [
  {
    title: "Product data intelligence",
    items: [
      "Centralized dashboard for extraction, descriptions, and SEO formatting",
      "Variants, specs, and document handling to keep catalogs consistent",
      "Image insights, clustering, and translation workflows in one place",
    ],
  },
  {
    title: "Operational readiness",
    items: [
      "Bulk import, validation, and feed monitoring for stable releases",
      "Usage analytics with guardrails for quotas and team visibility",
      "Role-based access for organization, roles, and API key management",
    ],
  },
  {
    title: "Developer tooling",
    items: [
      "Versioned APIs for formatting and browser automation endpoints",
      "Proxy and API route stubs ready for service integrations",
      "Supabase migration scripts for teams, usage counters, and keys",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-12">
        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold text-blue-600">Phase 1 delivery</p>
          <h1 className="text-4xl font-bold sm:text-5xl">AvidiaTech Product Automation</h1>
          <p className="text-lg text-gray-600">
            A cohesive Next.js + Clerk starter that wires together the dashboard shell,
            core product data workflows, and Supabase migrations so the team can ship.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700"
            >
              Open dashboard
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="rounded-lg border border-gray-300 px-5 py-3 text-gray-800 hover:bg-white"
            >
              Manage API keys
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-blue-200 px-5 py-3 text-blue-700 hover:bg-white"
            >
              Sign in / Sign up
            </Link>
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl bg-white p-8 shadow sm:grid-cols-2 lg:grid-cols-3">
          {featureSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              <ul className="space-y-2 text-gray-700">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-blue-50 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Ready for rollout</h2>
          <p className="mt-2 text-gray-700">
            Sign in with Clerk, explore the dashboard navigation, and plug in your service
            integrations to activate formatting, monitoring, and subscription flows.
          </p>
        </section>
      </div>
    </main>
  );
}
