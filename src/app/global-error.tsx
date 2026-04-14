"use client";

/**
 * global-error.tsx — catches errors that escape the root layout.
 *
 * This is a Next.js App Router requirement for errors that happen OUTSIDE the
 * normal layout tree (e.g. if layout.tsx itself throws). It must include its
 * own <html> and <body> tags since it replaces the root layout.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry if available
    if (typeof window !== "undefined") {
      try {
        // Dynamic import so Sentry is only loaded when needed
        import("@sentry/nextjs").then(({ captureException }) => {
          captureException(error);
        });
      } catch (_) {
        // Sentry not available — swallow
      }
    }
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong — AvidiaTech</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .card {
            max-width: 480px;
            width: 100%;
            text-align: center;
          }
          .icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 1.5rem;
          }
          h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
          p  { font-size: 0.9375rem; color: #94a3b8; line-height: 1.6; margin-bottom: 1.75rem; }
          .digest {
            font-size: 0.75rem;
            color: #475569;
            font-family: monospace;
            margin-bottom: 1.5rem;
          }
          button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #6366f1;
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 0.6rem 1.5rem;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 150ms ease;
          }
          button:hover { background: #4f46e5; }
          .bar {
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #0ea5e9 100%);
          }
        `}</style>
      </head>
      <body>
        <div className="bar" />
        <div className="card">
          {/* Diamond error icon */}
          <svg className="icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ge-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>
            <rect x="7" y="7" width="42" height="42" rx="8"
              transform="rotate(45 28 28)" fill="url(#ge-g)" opacity="0.15" />
            <rect x="7" y="7" width="42" height="42" rx="8"
              transform="rotate(45 28 28)" stroke="#ef4444" strokeWidth="1.5" fill="none" />
            <path d="M28 18v14" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="37" r="1.5" fill="#ef4444" />
          </svg>

          <h1>Something went wrong</h1>
          <p>
            An unexpected error occurred at the application level. Our team has
            been notified automatically. Please try reloading the page.
          </p>

          {error?.digest && (
            <p className="digest">Error ID: {error.digest}</p>
          )}

          <button onClick={reset}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2.5A6.5 6.5 0 1 1 3.2 5.5" />
              <path d="M3 2l.2 3.5L6.5 4" />
            </svg>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
