/** @type {import('next').NextConfig} */
const nextConfig = {};

// Wrap with Sentry only when SENTRY_DSN is present (avoids errors in local dev without the DSN set).
// See sentry.client.config.ts / sentry.server.config.ts for Sentry init options.
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry build-time options
      org:     process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Silently upload source maps in CI; don't print during dev
      silent: true,

      // Disable the Sentry webpack plugin telemetry opt-out prompt
      telemetry: false,

      // Upload source maps only in production builds
      sourcemaps: {
        disable: process.env.NODE_ENV !== "production",
      },

      // Automatically instrument Next.js data-fetching methods
      autoInstrumentServerFunctions: true,
    })
  : nextConfig;
