import Link from "next/link";

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none" className="h-10 w-10 mx-auto mb-4" aria-hidden="true">
          <rect width="28" height="28" rx="7" fill="url(#sub1)" />
          <path d="M8 20L11.5 9h5L20 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9.5" y1="16.5" x2="18.5" y2="16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="sub1" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
        </svg>

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
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-cyan-700"
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
          <a href="mailto:support@avidiatech.com" className="text-cyan-600 hover:underline dark:text-cyan-400">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
