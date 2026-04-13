import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-white text-slate-900 dark:bg-[#09090b] dark:text-slate-50">

      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-400/12 blur-[120px] dark:bg-indigo-500/8" />
        <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-violet-400/10 blur-[100px] dark:bg-violet-500/8" />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.12) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: "radial-gradient(rgba(100,116,139,0.18) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Identity stripe */}
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />

      {/* Content */}
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">

        {/* 404 number */}
        <span
          className="select-none text-[10rem] font-black leading-none tracking-tighter text-slate-100 dark:text-slate-800 sm:text-[14rem]"
          aria-hidden="true"
        >
          404
        </span>

        {/* Overlay badge */}
        <div className="-mt-12 mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="h-[6px] w-[6px] rounded-full bg-indigo-500" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Page not found
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          This page doesn&apos;t exist.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          The URL you followed may be broken, moved, or no longer exist. Head back to the dashboard or home page.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[14px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 hover:-translate-y-px"
          >
            Go to dashboard
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-px dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to home
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[13px]">
          {[
            { label: "AvidiaExtract", href: "/dashboard/extract" },
            { label: "AvidiaDescribe", href: "/dashboard/describe" },
            { label: "AvidiaSEO",     href: "/dashboard/seo" },
            { label: "API docs",      href: "/docs" },
            { label: "Support",       href: "/support" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-slate-400 underline-offset-2 transition hover:text-slate-700 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
