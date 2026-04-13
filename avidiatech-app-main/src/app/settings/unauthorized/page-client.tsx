import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      {/* Lock icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 shadow-sm dark:border-rose-500/25 dark:bg-rose-500/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-rose-500"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-1.5 shadow-sm dark:border-rose-500/25 dark:bg-slate-900">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
          Access denied
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          You don&apos;t have permission
        </h1>
        <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          This page requires elevated privileges. Contact your organization owner
          if you believe this is a mistake.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/settings/profile"
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:-translate-y-px"
        >
          Back to settings
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
