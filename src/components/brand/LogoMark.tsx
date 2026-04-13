/**
 * AvidiaTech brand components — single source of truth for the logo.
 *
 *  <LogoMark />        — diamond-chevron icon only (for navbars, favicons, etc.)
 *  <LogoLockup />      — diamond-chevron + "AvidiaTech" wordmark side-by-side
 *  <LogoStack />       — diamond-chevron centered above "AvidiaTech" (for auth pages)
 */

import type { SVGProps } from "react";

// ─── Diamond-chevron mark ─────────────────────────────────────────────────────
// Rounded diamond filled with indigo→violet gradient; three right-pointing
// chevrons in white (third at 35 % opacity for a depth effect).
//
// Accepts any SVG className for sizing (e.g. "h-8 w-8").
// Each instance uses a unique gradient id suffix to avoid SVG id collisions
// when multiple copies of the mark appear on the same page.

let _uid = 0;

export function LogoMark({
  className = "h-8 w-8",
  glowClassName,
  ...rest
}: SVGProps<SVGSVGElement> & { glowClassName?: string }) {
  // stable-ish id per mount — fine for non-SSR-critical decorative SVGs
  const uid = (_uid = (_uid + 1) % 9999);

  const gradId = `lm-grad-${uid}`;
  const shimId = `lm-shim-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[
        className,
        glowClassName ?? "drop-shadow-[0_2px_8px_rgba(99,102,241,0.32)]",
      ].join(" ")}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="55%"  stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={shimId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Rounded diamond body */}
      <rect
        x="3.8" y="3.8" width="24.4" height="24.4" rx="4.5"
        transform="rotate(45 16 16)"
        fill={`url(#${gradId})`}
      />
      {/* Top-left shimmer highlight */}
      <rect
        x="3.8" y="3.8" width="24.4" height="24.4" rx="4.5"
        transform="rotate(45 16 16)"
        fill={`url(#${shimId})`}
      />

      {/* Chevron 1 — full white */}
      <path d="M8.5 12.5L13.5 16L8.5 19.5"
        stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Chevron 2 — full white */}
      <path d="M13.5 12.5L18.5 16L13.5 19.5"
        stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Chevron 3 — faded (depth) */}
      <path d="M18.5 12.5L23.5 16L18.5 19.5"
        stroke="rgba(255,255,255,0.38)" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Horizontal lockup: mark + wordmark ───────────────────────────────────────
export function LogoLockup({
  tagline = "Product Data OS",
  className = "",
}: {
  tagline?: string | false;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
          AvidiaTech
        </span>
        {tagline && (
          <span className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Stacked lockup: mark centred above wordmark (auth pages) ─────────────────
export function LogoStack({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <LogoMark className="h-12 w-12" glowClassName="drop-shadow-[0_4px_16px_rgba(99,102,241,0.4)]" />
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        AvidiaTech
      </p>
    </div>
  );
}
