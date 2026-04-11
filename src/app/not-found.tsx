import Link from "next/link";

/**
 * Premium 404 — matches the app's dark ambient design language.
 * Uses the same slate-950 base, dot grid, glow blobs, and identity stripe
 * as the rest of the app so users never feel they've left the product.
 */
export default function NotFound() {
  return (
    <div className="dark relative min-h-[100dvh] bg-slate-950 text-slate-50 overflow-hidden flex flex-col items-center justify-center px-4">

      {/* ── Ambient glow blobs ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Top-left: indigo */}
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-indigo-500/18 blur-[130px]" />
        {/* Bottom-right: violet */}
        <div className="absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-violet-500/14 blur-[110px]" />
        {/* Center atmospheric: cyan */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.045]"
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
              "linear-gradient(90deg,#6366f1 0%,#8b5cf6 40%,#06b6d4 100%)",
          }}
        />

        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">

        {/* Glowing 404 number */}
        <div className="relative mb-6">
          <span
            className="text-[9rem] font-black leading-none tracking-tighter text-transparent bg-clip-text select-none"
            style={{
              backgroundImage:
                "linear-gradient(135deg,#818cf8 0%,#a78bfa 45%,#67e8f9 100%)",
            }}
          >
            404
          </span>
          {/* Soft glow behind the number */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 rounded-full" />
        </div>

        {/* Kicker badge */}
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Page not found
        </span>

        <h1 className="mb-3 text-2xl font-bold text-slate-100 tracking-tight">
          This page doesn&apos;t exist
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-slate-400 max-w-xs">
          The URL may have been mistyped, the page may have moved, or you may not have access to this resource.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-150 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 px-5 py-2.5 text-[13px] font-semibold text-slate-300 transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="text-[11px] text-slate-600">Quick links:</span>
          {[
            { label: "Extract",  href: "/dashboard/extract" },
            { label: "Describe", href: "/dashboard/describe" },
            { label: "Match",    href: "/dashboard/match" },
            { label: "Import",   href: "/dashboard/import" },
            { label: "Support",  href: "/dashboard/support" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11.5px] font-medium text-slate-500 hover:text-indigo-300 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
