"use client";

import Link from "next/link";
import PageShell, { PageHeader } from "@/components/layout/PageShell";

export default function OrganizationPage() {
  return (
    <PageShell glow="neutral">
      <PageHeader
        glow="neutral"
        kicker="Organization"
        dot="bg-slate-400"
        title="Organization & Team"
        description="Manage your workspace settings, team members, and access controls for your AvidiaTech account."
        right={
          <Link
            href="/dashboard/roles"
            className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Manage roles
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            ),
            iconBg: "bg-slate-100 dark:bg-slate-800",
            title: "Workspace",
            items: [
              "Rename your tenant to match your brand or organization.",
              "Set a default language and region for catalog exports.",
              "Configure audit trail retention period.",
              "Manage workspace-level API rate limits.",
            ],
            link: { href: "/settings/organization", label: "Edit settings" },
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            ),
            iconBg: "bg-cyan-50 dark:bg-cyan-500/10",
            title: "Team members",
            items: [
              "Invite teammates by email and assign roles: owner, admin or member.",
              "View active users and pending invitations with status indicators.",
              "Reassign or remove users to keep your organization current.",
              "Set per-member module access permissions.",
            ],
            link: { href: "/dashboard/roles", label: "Manage team" },
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ),
            iconBg: "bg-violet-50 dark:bg-violet-500/10",
            title: "Access control",
            items: [
              "Role-based permissions: owner, admin, member, viewer.",
              "Module-level access restrictions per team member.",
              "SSO configuration for enterprise tenants.",
              "IP allowlist for API access (Enterprise plan).",
            ],
            link: { href: "/dashboard/roles", label: "Configure access" },
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
            ),
            iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
            title: "API & integrations",
            items: [
              "Generate and rotate API keys for programmatic access.",
              "Configure webhooks for pipeline events and job completions.",
              "Connect BigCommerce, Shopify, and WooCommerce storefronts.",
              "View API usage logs and rate limit status.",
            ],
            link: { href: "/settings/developer/api-keys", label: "Manage API keys" },
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
              <h2 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">{card.title}</h2>
            </div>
            <ul className="space-y-2.5">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                  <span className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={card.link.href}
              className="mt-4 inline-flex h-7 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {card.link.label} →
            </Link>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
