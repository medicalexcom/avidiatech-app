import Link from "next/link";

export default function SubscribePage() {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/8 blur-[120px]" />
        <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-violet-400/8 dark:bg-violet-500/8 blur-[100px]" />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.1) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />

      {/* Back link */}
      <div className="absolute top-0 left-0 right-0 pt-6 px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/25">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">AvidiaTech</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Coming soon
            </span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Subscription Plans</h1>
          <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
            Self-serve plan selection is coming soon. In the meantime, start your trial or contact us for access.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/trial-setup"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Start 14-day trial →
            </Link>
            <Link
              href="/dashboard/pricing"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              View pricing
            </Link>
          </div>
        </div>

        <p className="mt-4 text-[12px] text-slate-400 dark:text-slate-500">
          Questions?{" "}
          <a href="mailto:support@avidiatech.com" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
