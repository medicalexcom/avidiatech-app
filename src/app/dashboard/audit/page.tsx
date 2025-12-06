"use client";

/**
 * AvidiaAudit module page
 *
 * AvidiaAudit scores and validates product data across the AvidiaTech pipeline.
 * It checks structure, SEO, naming policies, internal links, and compliance rules,
 * then returns a structured audit result that can drive auto-heal and retries.
 */

export default function AuditPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background: gradients + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-amber-300/28 blur-3xl dark:bg-amber-500/25" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/18" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* HERO / HEADER */}
        <section className="mb-2">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/45 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-5 shadow-[0_0_40px_rgba(251,191,36,0.35)] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_0_80px_rgba(251,191,36,0.45)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: descriptor */}
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  Data Intelligence · AvidiaAudit
                  <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-amber-500 dark:text-amber-200">
                    Quality &amp; compliance engine
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
                    Turn your product rules into a{" "}
                    <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300 bg-clip-text text-transparent dark:from-amber-300 dark:via-amber-200 dark:to-emerald-200">
                      measurable, enforceable audit score
                    </span>
                    .
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Run automated quality checks on every product: structure, SEO, naming rules,
                    internal links, and compliance. AvidiaAudit turns your policies into a
                    consistent, machine-readable score that powers auto-heal, safe automation,
                    and store-ready confidence.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/60 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-amber-500/60 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>
                      Structured <span className="font-semibold">auditResult JSON</span> for every row.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/55 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-emerald-500/55 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      Drives auto-heal and safe sync workflows across modules.
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>
                      Built for regulated, policy-heavy catalogs like MedicalEx.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: module status + score card skeleton */}
              <div className="mt-1 w-full max-w-xs space-y-3 lg:mt-0 lg:max-w-sm">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950/90">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        Module status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-200">
                          Engine active in pipelines · UI workspace in design
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      Audit engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    AvidiaAudit already powers background QA and auto-heal for MedicalEx;
                    this UI will surface that intelligence for every tenant.
                  </p>
                </div>

                {/* Static audit-result skeleton */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_18px_45px_rgba(148,163,184,0.4)] dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Sample audit snapshot
                  </p>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Overall score</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                        94 / 100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Structure &amp; SEO</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-300">
                        OK
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Compliance</span>
                      <span className="font-medium text-amber-500 dark:text-amber-300">
                        Review
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Catalog integrity</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-300">
                        OK
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                    UI will let you drill into per-check flags, messages, and auto-heal
                    actions for each product.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TWO-COLUMN BODY */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* Left column: what it does / checks */}
          <div className="space-y-4">
            {/* What it does */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Product data quality, measured and enforceable
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                AvidiaAudit is the quality layer for your product content. It inspects each
                row against your rules—naming conventions, SEO caps, internal links, variant
                behavior, manuals, and more—then emits a structured audit payload and score
                that other modules can trust.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    <span className="font-medium">Structured auditResult:</span> machine-readable
                    JSON with per-check flags, messages, and an overall score that other
                    services (Sheets, API, dashboard) can consume.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Validates{" "}
                    <span className="font-medium">
                      H1, meta titles, descriptions, bullets, manuals, and internal links
                    </span>{" "}
                    against your custom rules and thresholds.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Detects{" "}
                    <span className="font-medium">
                      duplicate SKUs, missing variants, broken manuals, and non-compliant wording
                    </span>{" "}
                    before sync to the store.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Drives <span className="font-medium">auto-heal flows</span>: failing checks can
                    trigger automatic revision passes instead of manual editing.
                  </span>
                </li>
              </ul>
            </div>

            {/* What it checks (cards) */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                What AvidiaAudit checks
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300">
                    Content &amp; SEO
                  </div>
                  <ul className="mt-1.5 space-y-1.5">
                    <li>• H1 length and format against your policies</li>
                    <li>• Meta title / description caps and suffix rules</li>
                    <li>• Forbidden phrases, bloat, and repetition</li>
                    <li>• Presence and placement of manuals sections</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300">
                    Catalog integrity
                  </div>
                  <ul className="mt-1.5 space-y-1.5">
                    <li>• Duplicate SKU detection within a batch</li>
                    <li>• Variant structure and option coverage</li>
                    <li>• Required brand / category / warranty fields</li>
                    <li>• Internal link presence and canonical URLs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Planned workflow · how AvidiaAudit will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-500 dark:bg-slate-800 dark:text-amber-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Pick a product set
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Choose rows from AvidiaExtract / SEO (a brand, a batch, or failed rows)
                      and send them through AvidiaAudit for scoring and validation.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-500 dark:bg-slate-800 dark:text-amber-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Review audit scores &amp; issues
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      See per-product scores, flags, and messages grouped by category
                      (Structure, SEO, Compliance, Catalog). Filter down to critical issues.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-500 dark:bg-slate-800 dark:text-amber-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Auto-heal or fix manually
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trigger automated revision passes for failing items, or open a detail
                      view to adjust content manually before re-running the audit.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(251,191,36,0.35)] hover:bg-amber-400 disabled:opacity-70 dark:shadow-[0_12px_32px_rgba(251,191,36,0.55)]"
                  disabled
                >
                  Audit workspace (coming soon)
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The Audit workspace will show batch overviews, per-row scores, and
                  structured auditResult payloads so you can trust what goes to production.
                </p>
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaSEO &amp; Describe
                  </span>{" "}
                  — audit generated copy and force automatic revision when scores are below
                  threshold.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaExtract &amp; Specs
                  </span>{" "}
                  — verify required technical fields and structured specs before export.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaImport
                  </span>{" "}
                  — block exports or syncs when critical checks fail, so bad data never
                  reaches your store.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Monitoring / Alerts
                  </span>{" "}
                  — feed into future AvidiaMonitor to watch for regressions and drift over
                  time.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Over time, AvidiaAudit becomes the guardrail layer that keeps every other
                AvidiaTech module honest—so you can scale automation without losing control.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
