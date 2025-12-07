'use client';

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Workspace · notifications
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-slate-50">
            Notification center
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Stay ahead of important events across the AvidiaTech pipeline — from quota
            usage and ingestion health to change monitoring and audit signals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-300" />
            Email and in-app ready
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
            Per-workspace rules · controls coming soon
          </span>
        </div>
      </header>

      {/* TOP SUMMARY STRIP */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Delivery channels
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            Email · in-app
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Start in-product, then layer email and future Slack/webhooks.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Daily volume</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            — notifications
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Future view: how many alerts are being generated per day.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Critical alert types
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            Quota · ingest · audit
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Core signals that directly affect uptime and revenue.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configuration status
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            Drafting
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Future UI will let you tune noise levels and preferences per user.
          </p>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* LEFT: WHAT YOU'LL BE NOTIFIED ABOUT */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Core notification streams
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The notification center focuses on the events that actually need your
              attention — not a flood of logs. It will consolidate signals from
              ingestion, SEO, audit, pricing, and monitoring into one place.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li>
                <span className="font-medium">Quota alerts:</span> know when you are
                approaching or exceeding monthly limits so you can adjust plans or
                usage before anything hard-fails.
              </li>
              <li>
                <span className="font-medium">Ingestion status:</span> receive success,
                retry, or failure notifications for ingestion jobs and batches instead
                of manually checking logs.
              </li>
              <li>
                <span className="font-medium">Change monitoring:</span> get alerted when
                manuals, specs, or prices update so you can re-run AvidiaSEO, Audit, or
                Import where needed.
              </li>
              <li>
                <span className="font-medium">Audit warnings:</span> surface issues such
                as missing data, compliance problems, or low-quality content that should
                be fixed before pushing live.
              </li>
              <li>
                <span className="font-medium">Delivery preferences:</span> choose email
                and in-app for now, with webhooks and Slack connectors on the roadmap.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:p-5 dark:bg-slate-900/60 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              How this ties into the rest of AvidiaTech
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              As modules mature, they will emit structured events into the notification
              center. You&apos;ll be able to follow the trail from an alert directly to
              the affected ingestion, product, or export.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li>• Ingest failures link back to AvidiaExtract or Feeds runs.</li>
              <li>• Audit warnings open directly in the Audit workspace.</li>
              <li>• Price and spec changes tie into Monitor and Price modules.</li>
              <li>• Quota alerts connect to your subscription and usage views.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: CONFIG + ROADMAP */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Planned controls
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This area will become the control panel for tuning noise levels and
              delivery options.
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900/60 dark:border-slate-700">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    Per-event severity
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose which events are silent, in-app only, or also sent by email.
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900/60 dark:border-slate-700">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    Channel preferences
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure per-user settings so ops, devs, and merch teams see the
                    right signals in the right place.
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900/60 dark:border-slate-700">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    Digest vs instant
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Decide whether alerts are batched into digests or delivered
                    immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Roadmap snapshot
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Notifications will evolve with the rest of the platform.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>• Webhook endpoints for custom alert routing.</li>
              <li>• Slack / Teams connectors for real-time ops channels.</li>
              <li>• Per-tenant and per-workspace defaults for new users.</li>
              <li>• Alert templates that map directly to runbooks.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
