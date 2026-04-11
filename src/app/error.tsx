"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Premium global error boundary — Next.js App Router `error.tsx`.
 * Must be a Client Component. Renders when an unhandled error bubbles
 * up from a page or layout. Matches the app's dark ambient design language.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service if available
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="dark relative min-h-[100dvh] bg-slate-950 text-slate-50 overflow-hidden flex flex-col items-center justify-center px-4">

      {/* ── Ambient glow blobs ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Top-left: rose */}
        <div className="absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full bg-rose-500/16 blur-[130px]" />
        {/* Bottom-right: orange */}
        <div className="absolute -bottom-24 -right-24 h-[380px] w-[380px] rounded-full bg-orange-500/12 blur-[110px]" />
        {/* Center atmospheric: amber */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[260px] w-[440px] rounded-full bg-amber-500/7 blur-[100px]" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgba(148,163,184,0.55) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top identity stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background:
              "linear-gradient(90deg,#f43f5e 0%,#fb923c 50%,#fbbf24 100%)",
          }}
        />

        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">

        {/* Icon */}
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9 text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          {/* Glow behind icon */}
          <div className="absolute inset-0 -z-10 blur-2xl opacity-25 bg-rose-500 rounded-full" />
        </div>

        {/* Kicker badge */}
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-rose-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          Something went wrong
        </span>

        <h1 className="mb-3 text-2xl font-bold text-slate-100 tracking-tight">
          An unexpected error occurred
        </h1>

        <p className="mb-2 text-sm leading-relaxed text-slate-400">
          We&apos;ve been notified and are looking into it. You can try again or return to the dashboard.
        </p>

        {/* Error digest for support reference */}
        {error.digest && (
          <p className="mb-6 text-[11px] font-mono text-slate-600">
            Reference:{" "}
            <span className="text-slate-500 select-all">{error.digest}</span>
          </p>
        )}
        {!error.digest && <div className="mb-6" />}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-150 shadow-lg shadow-rose-900/40 hover:shadow-rose-800/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 px-5 py-2.5 text-[13px] font-semibold text-slate-300 transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Dashboard
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-8 text-[11.5px] text-slate-600">
          Problem persisting?{" "}
          <Link
            href="/dashboard/support"
            className="text-slate-500 hover:text-rose-300 transition-colors underline underline-offset-2"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
