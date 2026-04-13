/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Next.js 15+ / 16 to activate instrumentation.ts
  // (Sentry server-side init moved there from the old sentry.server.config approach)
  experimental: {
    instrumentationHook: true,
  },
};

// ─── Sentry ────────────────────────────────────────────────────────────────────
// Guard the entire Sentry block so a missing package or incompatible version
// can never prevent the build from starting.
const hasSentry =
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (hasSentry) {
  let withSentryConfig;
  try {
    withSentryConfig = require("@sentry/nextjs").withSentryConfig;
  } catch (_) {
    console.warn(
      "[next.config.js] @sentry/nextjs not available — Sentry build plugin skipped."
    );
  }

  if (typeof withSentryConfig === "function") {
    try {
      module.exports = withSentryConfig(nextConfig, {
        org:       process.env.SENTRY_ORG,
        project:   process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,

        // Suppress Sentry CLI output in CI
        silent: true,

        // No telemetry opt-out prompts
        telemetry: false,

        // Upload source maps only in production builds
        sourcemaps: {
          disable: process.env.NODE_ENV !== "production",
        },

        // NOTE: autoInstrumentServerFunctions is intentionally omitted.
        // Next.js 15+ / 16 uses instrumentation.ts (src/instrumentation.ts)
        // for server-side Sentry init — the old option is deprecated and
        // causes "Couldn't find any pages or app directory" errors.
      });
    } catch (err) {
      console.warn(
        "[next.config.js] withSentryConfig failed — falling back to plain config:",
        err.message
      );
      module.exports = nextConfig;
    }
  } else {
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
