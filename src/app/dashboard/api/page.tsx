"use client";

/**
 * AvidiaAPI module page
 *
 * AvidiaAPI exposes AvidiaTech’s ingestion, normalization, and content engines
 * through a unified REST API. Developers can integrate Extract, Describe, SEO,
 * Variants, Audit, and more directly into their own apps and workflows.
 */

export default function ApiPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/26 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-violet-500/22 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER / HERO */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/45 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(34,211,238,0.35)] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: title + description */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  Developer Tools · AvidiaAPI
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-cyan-200">Unified product data API</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    Ship on top of{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-200">
                      Avidia’s product data engine.
                    </span>
                  </h1>
                  <p className="text-sm text-slate-300">
                    AvidiaAPI lets you programmatically ingest URLs, retrieve normalized
                    JSON, generate SEO content, trigger audits, and sync products into
                    your own tools. Instead of reinventing scraping and formatting, you
                    call a single REST API—and focus on the product experience.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/60 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-200">
                      Unified REST surface across Extract, Describe, SEO, Audit, and more.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-violet-500/55 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-slate-200">
                      Tenant-scoped API keys with role-aware permissions and quotas.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700/70 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span className="text-slate-200">
                      Pagination, filters, and webhooks for production workloads.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + mini code sample */}
              <div className="w-full max-w-xs lg:max-w-sm mt-1 lg:mt-0 space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                        <span className="text-sm font-semibold text-cyan-200">
                          Endpoint design locked · Beta client planned
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300">
                      API-first
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AvidiaAPI will mirror the dashboard flows: ingest URLs, manage jobs,
                    fetch normalized payloads, and request SEO / Audit runs with the same
                    primitives the UI uses.
                  </p>
                </div>

                {/* Tiny "code" preview */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Quick example · Ingest a URL
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                      REST · JSON
                    </span>
                  </div>
                  <pre className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2 text-[10px] leading-relaxed text-slate-300 overflow-auto">
{`POST https://api.avidiatech.com/v1/ingest
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "url": "https://manufacturer.com/product/123",
  "source": "manufacturer",
  "tenant_id": "tenant_x"
}`}
                  </pre>
                  <p className="mt-2 text-[10px] text-slate-500">
                    The same API surface powers AvidiaExtract and AvidiaSEO behind the
                    scenes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: two-column layout */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* LEFT: what it does / value */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                One API for the entire product data pipeline
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                AvidiaAPI wraps ingestion, normalization, content generation, audit, and
                export in a single REST contract. Whether you&apos;re building internal
                tools, syncing to a custom store, or wiring Avidia into an existing
                platform, you work with the same endpoints the dashboard uses.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>
                    <span className="font-medium">Unified product API:</span> list, filter,
                    and page through normalized products across brands, catalogs, and
                    ingest jobs—scoped to your tenant.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>
                    <span className="font-medium">Action endpoints:</span> trigger ingest,
                    Describe / SEO runs, Audit passes, or Import exports directly from
                    your own services.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>
                    <span className="font-medium">Tenant-bound API keys:</span> keys are
                    tied to workspaces and roles so you can separate staging, production,
                    agencies, and individual clients.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>
                    <span className="font-medium">Enterprise-ready behaviors:</span> rate
                    limiting, audit logs, and predictable error shapes for robust
                    integrations.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Common AvidiaAPI use cases
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                    Custom internal tools
                  </div>
                  <p className="mt-1.5">
                    Build lightweight internal UIs for merchandisers, buyers, or support
                    teams that read from the same normalized product JSON as the
                    AvidiaTech dashboard.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                    Platform integrations
                  </div>
                  <p className="mt-1.5">
                    Wire Avidia into existing platforms, PIMs, or custom storefronts
                    without moving away from your current tech stack.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Planned workflow · how AvidiaAPI will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Create API keys</div>
                    <p className="text-xs text-slate-400">
                      Generate scoped API keys from the AvidiaTech dashboard, with labels,
                      roles, and environment tags (staging, production, client-specific).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Call ingestion &amp; content endpoints</div>
                    <p className="text-xs text-slate-400">
                      Use the REST endpoints to ingest URLs, fetch job status, retrieve
                      normalized payloads, and request Describe / SEO / Audit runs as part
                      of your own workflows.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">Listen for events &amp; sync</div>
                    <p className="text-xs text-slate-400">
                      Subscribe to webhooks for job completion, audit results, and export
                      readiness, then sync into your store, PIM, or analytics stack.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.55)] hover:bg-cyan-400"
                  disabled
                >
                  API keys &amp; docs (coming soon)
                </button>
                <p className="text-xs text-slate-400">
                  A dedicated API section in the dashboard will let you manage keys, view
                  logs, and copy live examples in your preferred language.
                </p>
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                <li>
                  • <span className="font-medium text-slate-200">AvidiaExtract</span> — ingest
                  URLs and access normalized payloads entirely via API.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaDescribe &amp; SEO</span>{" "}
                  — programmatically request descriptions and SEO JSON for any product.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaAudit</span> — trigger
                  audits on batches and consume structured auditResult payloads.
                </li>
                <li>
                  • <span className="font-medium text-slate-200">AvidiaImport &amp; Price</span>{" "}
                  — pull export-ready products and prices into your own sync or pricing
                  services.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500">
                AvidiaAPI makes the entire AvidiaTech stack available as building blocks
                for your own SaaS, internal tools, and automation scripts.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
