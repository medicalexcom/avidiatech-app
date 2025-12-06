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
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* Header / hero row */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            Data Intelligence · AvidiaAudit
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50 sm:text-3xl">
            AvidiaAudit
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Run automated quality checks on every product: structure, SEO, naming rules,
            internal links, and compliance. AvidiaAudit turns your policies into a
            consistent, machine-readable score that powers auto-heal and safe automation.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="text-xs font-medium text-slate-400">Module status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
              <span className="text-sm font-semibold text-amber-200">
                Engine active in pipelines · UI workspace in design
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout: overview + workflow */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        {/* Left column: what it does / value */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Product data quality, measured and enforceable
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              AvidiaAudit is the quality layer for your product content. It inspects each
              row against your rules—naming conventions, SEO caps, internal links, variant
              behavior, manuals, and more—then emits a structured audit payload and score
              that other modules can trust.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
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
                  Validates <span className="font-medium">H1, meta titles, descriptions, bullets,
                  manuals, and internal links</span> against your custom rules and thresholds.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Detects <span className="font-medium">duplicate SKUs, missing variants, broken manuals,
                  and non-compliant wording</span> before sync to the store.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Drives <span className="font-medium">auto-heal flows</span>: failing checks can trigger
                  automatic revision passes instead of manual editing.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              What AvidiaAudit checks
            </h3>
            <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Content &amp; SEO
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  <li>• H1 length and format against your policies</li>
                  <li>• Meta title / description caps and suffix rules</li>
                  <li>• Forbidden phrases, bloat, and repetition</li>
                  <li>• Presence and placement of manuals sections</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
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

        {/* Right column: planned workflow / integration story */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Planned workflow · how AvidiaAudit will run
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-100">Pick a product set</div>
                  <p className="text-xs text-slate-400">
                    Choose rows from AvidiaExtract / SEO (a brand, a batch, or failed rows)
                    and send them through AvidiaAudit for scoring and validation.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-100">Review audit scores &amp; issues</div>
                  <p className="text-xs text-slate-400">
                    See per-product scores, flags, and messages grouped by category
                    (Structure, SEO, Compliance, Catalog). Filter down to critical issues.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-amber-300">
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-100">Auto-heal or fix manually</div>
                  <p className="text-xs text-slate-400">
                    Trigger automated revision passes for failing items, or open a detail
                    view to adjust content manually before re-running the audit.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(251,191,36,0.55)] hover:bg-amber-400"
                disabled
              >
                Audit workspace (coming soon)
              </button>
              <p className="text-xs text-slate-400">
                The Audit workspace will show batch overviews, per-row scores, and
                structured auditResult payloads so you can trust what goes to production.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Planned integrations
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>
                • <span className="font-medium text-slate-200">AvidiaSEO &amp; Describe</span> — audit
                generated copy and force automatic revision when scores are below threshold.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaExtract &amp; Specs</span> — verify
                required technical fields and structured specs before export.
              </li>
              <li>
                • <span className="font-medium text-slate-200">AvidiaImport</span> — block exports or
                syncs when critical checks fail, so bad data never reaches your store.
              </li>
              <li>
                • <span className="font-medium text-slate-200">Monitoring / Alerts</span> — feed into
                future AvidiaMonitor to watch for regressions and drift over time.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
