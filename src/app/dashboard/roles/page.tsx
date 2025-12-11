'use client';

export default function RolesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background gradients + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-300/24 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/22 blur-3xl dark:bg-sky-500/18" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace settings
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-slate-50">
              Roles &amp; Permissions
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Define who can see what, who can trigger powerful automations, and who owns
              billing. A clean permission model keeps your AvidiaTech workspace safe as your
              team grows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-emerald-200 text-emerald-700 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Role model drafted
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-600 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
              UI for assignment &amp; custom roles in design
            </span>
          </div>
        </header>

        {/* BODY GRID */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* LEFT: ROLE DEFINITIONS */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Default roles in AvidiaTech
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Start with a simple, opinionated set of roles that match how most teams
                work. Later, you&apos;ll be able to layer on custom roles for agencies,
                clients, and power users.
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Owner</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Full control over billing, subscriptions, workspaces, and all product
                    modules. Owners can invite/remove admins, configure tenants, and manage
                    API keys.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Admin</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Can manage products and pipelines (Extract, Describe, SEO, Import, etc.),
                    view analytics, configure monitors, and invite or remove members. Cannot
                    change billing owners or delete the workspace.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Member</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Can view and edit products, run allowed modules (according to workspace
                    settings), and see non-sensitive analytics. Cannot touch billing,
                    subscription plans, or team-level security settings.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Custom roles{" "}
                    <span className="text-[11px] font-normal text-amber-600 dark:text-amber-300">
                      (coming soon)
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                    Design your own roles with granular permissions: per-module access,
                    read/write scopes, API-only users, client viewers, and more.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                How roles map to sensitive actions
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Some actions are inherently high impact—like changing pricing rules or
                deleting ingest jobs. Roles keep those guarded by default.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li>
                  • Only Owners can change billing plans, cancel workspaces, or transfer
                  ownership.
                </li>
                <li>
                  • Owners and Admins can rotate API keys, configure monitor rules, and
                  manage feeds.
                </li>
                <li>
                  • Members can run day-to-day product workflows but not change
                  workspace-wide policies.
                </li>
                <li>
                  • Custom roles will let you create &quot;viewer-only&quot; or
                  &quot;client-limited&quot; access.
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT: PERMISSION MATRIX / COMING SOON */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Planned permission matrix
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                This area will evolve into an interactive table where you can see, at a
                glance, who can do what across the workspace.
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90 text-[11px] shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                    Capability
                  </div>
                  <div className="px-3 py-2 text-center font-medium text-emerald-700 dark:text-emerald-300">
                    Owner
                  </div>
                  <div className="px-3 py-2 text-center font-medium text-sky-700 dark:text-sky-300">
                    Admin
                  </div>
                  <div className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">
                    Member
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      Manage billing &amp; subscription
                    </div>
                    <div className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-slate-400 dark:text-slate-500">
                      —
                    </div>
                    <div className="px-3 py-2 text-center text-slate-400 dark:text-slate-500">
                      —
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      Invite &amp; remove users
                    </div>
                    <div className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-sky-700 dark:text-sky-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-slate-400 dark:text-slate-500">
                      —
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      Run Extract / SEO / Import workflows
                    </div>
                    <div className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-sky-700 dark:text-sky-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">
                      ✓
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      Manage API keys &amp; webhooks
                    </div>
                    <div className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-sky-700 dark:text-sky-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-slate-400 dark:text-slate-500">
                      —
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      View analytics &amp; dashboards
                    </div>
                    <div className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-sky-700 dark:text-sky-300">
                      ✓
                    </div>
                    <div className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">
                      ✓
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
                In a future version, you&apos;ll be able to tweak these permissions per role
                and save presets per tenant or client.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Coming soon: role assignment UI
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                This page will evolve into a full user management screen—invite teammates,
                assign roles, and see who has access to which modules from a single place.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>• Per-user role assignment with audit trails.</li>
                <li>• Client / agency workspaces with scoped access.</li>
                <li>• API-only &quot;service&quot; users for automation.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
