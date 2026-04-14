/**
 * Next.js 15+ / 16 instrumentation hook.
 *
 * Next.js calls `register()` once when the server process starts.
 * Sentry 10.x requires this file to initialise on the server and edge runtimes
 * instead of the old `sentry.server.config.ts` auto-import approach.
 *
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // No DSN configured — skip Sentry initialisation entirely.
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
