import PageShell, { PageHeader } from "@/components/layout/PageShell";
import Link from "next/link";


export const metadata = {
  title: "Integrations | AvidiaTech Product Data OS",
  description: "Connect AvidiaTech with your existing tools and platforms.",
};


// ── Integration catalogue ─────────────────────────────────────────────────────

const integrations = [
  {
    group: "E-commerce platforms",
    items: [
      {
        name: "Shopify",
        description: "Sync your Shopify product catalogue and push enriched data back in real time.",
        status: "coming-soon" as const,
        logo: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <rect width="24" height="24" rx="5" fill="#96BF48" />
            <path d="M15.5 6.5c0-.3-.3-.5-.5-.5h-.8c-.1-.6-.5-2-1.7-2-.1 0-.2 0-.3.1-.4-.5-.9-.8-1.4-.8-3.5 0-5.2 4.4-5.7 6.6L3.8 10l-.3 1.3 8.2 1.4 3-5.7-.7-.5zM13 6H9.7C10.2 4.5 11.3 3 12.5 4c.3.3.5.7.5 1.2V6z" fill="white" />
          </svg>
        ),
      },
      {
        name: "WooCommerce",
        description: "Connect your WooCommerce store to pull product data and push back enriched listings.",
        status: "coming-soon" as const,
        logo: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <rect width="24" height="24" rx="5" fill="#7F54B3" />
            <text x="5" y="17" fontSize="9" fontWeight="bold" fill="white">Woo</text>
          </svg>
        ),
      },
      {
        name: "BigCommerce",
        description: "Bi-directional sync with BigCommerce catalogues and storefront metadata.",
        status: "coming-soon" as const,
        logo: (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <rect width="24" height="24" rx="5" fill="#34313F" />
            <text x="4" y="17" fontSize="8" fontWeight="bold" fill="white">BC</text>
          </svg>
        ),
      },
    ],
  },
  {
    group: "PIM & DAM",
    items: [
      {
        name: "Akeneo",
        description: "Push enriched product content directly into your Akeneo PIM.",
        status: "coming-soon" as const,
        logo: null,
      },
      {
        name: "Plytix",
        description: "Export matched and enriched attributes to your Plytix product hub.",
        status: "coming-soon" as const,
        logo: null,
      },
      {
        name: "Cloudinary",
        description: "Store and retrieve product images from your Cloudinary DAM.",
        status: "coming-soon" as const,
        logo: null,
      },
    ],
  },
  {
    group: "Feeds & marketplaces",
    items: [
      {
        name: "Google Merchant Center",
        description: "Export compliant Shopping feeds directly to Google Merchant Center.",
        status: "coming-soon" as const,
        logo: null,
      },
      {
        name: "Amazon Seller Central",
        description: "Generate Amazon-compatible listing feeds from enriched product data.",
        status: "coming-soon" as const,
        logo: null,
      },
      {
        name: "Custom feed export",
        description: "Build and schedule CSV / XML / JSON feeds to any destination via AvidiaFeeds.",
        status: "live" as const,
        href: "/dashboard/feeds",
        logo: null,
      },
    ],
  },
  {
    group: "Developer",
    items: [
      {
        name: "REST API",
        description: "Programmatic access to all AvidiaTech modules via authenticated REST endpoints.",
        status: "live" as const,
        href: "/dashboard/api",
        logo: null,
      },
      {
        name: "Webhooks",
        description: "Push real-time event notifications to any HTTPS endpoint when pipeline jobs complete.",
        status: "live" as const,
        href: "/settings/developer",
        logo: null,
      },
    ],
  },
];

const statusLabel: Record<"live" | "coming-soon", string> = {
  "live":        "Live",
  "coming-soon": "Coming soon",
};

const statusCls: Record<"live" | "coming-soon", string> = {
  "live":        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "coming-soon": "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function PlaceholderLogo({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {name.slice(0, 2)}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <PageShell glow="indigo">
      <PageHeader
        glow="indigo"
        kicker="Integrations"
        dot="bg-indigo-500"
        title={
          <>
            Connect your{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 bg-clip-text text-transparent">
              existing stack.
            </span>
          </>
        }
        description="Link AvidiaTech to your e-commerce platform, PIM, DAM, or marketplace. Live integrations are available now; coming-soon integrations are in active development."
      />

      {/* ── Request banner ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/60 px-5 py-4 dark:border-indigo-500/20 dark:bg-indigo-500/8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">
              Don&apos;t see your platform?
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              We prioritise integrations based on customer demand. Let us know what you need.
            </p>
          </div>
          <a
            href="mailto:integrations@avidiatech.com?subject=Integration request"
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-indigo-300/60 bg-white px-4 text-[13px] font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
          >
            Request integration →
          </a>
        </div>
      </div>

      {/* ── Integration groups ─────────────────────────────────────────── */}
      <div className="space-y-8">
        {integrations.map((group) => (
          <section key={group.group}>
            <div className="mb-3 flex items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {group.group}
              </p>
              <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800/80" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const card = (
                  <div
                    className={[
                      "flex flex-col gap-3 rounded-2xl border p-5 transition-all",
                      item.status === "live"
                        ? "border-slate-200/80 bg-white/95 shadow-card hover:-translate-y-[1px] hover:shadow-card-md dark:border-slate-800 dark:bg-slate-900/80"
                        : "border-slate-200/60 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-900/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {item.logo ?? <PlaceholderLogo name={item.name} />}
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">{item.name}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    {item.status === "live" && (item as any).href && (
                      <span className="mt-auto text-[12px] font-medium text-indigo-600 dark:text-indigo-400">
                        Open →
                      </span>
                    )}
                  </div>
                );

                return item.status === "live" && (item as any).href ? (
                  <Link key={item.name} href={(item as any).href}>
                    {card}
                  </Link>
                ) : (
                  <div key={item.name}>{card}</div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
