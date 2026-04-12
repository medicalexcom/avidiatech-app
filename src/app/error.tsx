"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-white text-slate-900 dark:bg-[#09090b] dark:text-slate-50">

      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-rose-400/10 blur-[120px] dark:bg-rose-500/8" />
        <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-orange-400/8 blur-[100px] dark:bg-orange-500/6" />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.12) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.18) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Identity stripe */}
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#f43f5e 0%,#fb923c 50%,#fbbf24 100%)" }} />

      {/* Content */}
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">

        {/* Icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 shadow-sm dark:border-rose-500/25 dark:bg-rose-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-rose-500" aria-hidden="true">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        {/* Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 shadow-sm dark:border-rose-500/25 dark:bg-slate-900">
          <span className="h-[6px] w-[6px] rounded-full bg-rose-500" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
            Something went wrong
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          An unexpected error occurred.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          We&apos;ve been notified. Please try again or return to the dashboard. If the issue persists, contact support.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-[14px] font-semibold text-white shadow-sm shadow-rose-600/25 transition hover:bg-rose-700 hover:-translate-y-px"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M13.5 8a5.5 5.5 0 01-9.77 3.43" />
              <path d="M2.5 8a5.5 5.5 0 019.77-3.43" />
              <polyline points="2.5 4 2.5 8 6.5 8" />
              <polyline points="13.5 12 13.5 8 9.5 8" />
            </svg>
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-px dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Error digest + support */}
        <div className="mt-10 space-y-2">
          {error.digest && (
            <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
              Reference: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{error.digest}</code>
            </p>
          )}
          <p className="text-[12px] text-slate-400 dark:text-slate-500">
            Need help?{" "}
            <a href="mailto:support@avidiatech.com" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
