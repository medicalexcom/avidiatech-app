// ─── Security headers ──────────────────────────────────────────────────────────
const securityHeaders = [
  // Prevent clickjacking — only allow embedding in same origin
  { key: "X-Frame-Options",        value: "SAMEORIGIN" },
  // Block MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information sent with requests
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  // Permissions policy — disable unused APIs
  { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
  // Force HTTPS for 1 year (enable HSTS)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Basic CSP — allows Clerk, Supabase, Stripe, Sentry CDN and self
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Clerk + Stripe + Sentry + inline (Next.js needs 'unsafe-inline')
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.avidiatech.com https://js.stripe.com https://browser.sentry-cdn.com https://cdn.jsdelivr.net",
      // Styles: self + inline (Tailwind CSS-in-JS)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' data: https://fonts.gstatic.com",
      // Images: self + data URIs + Clerk avatar CDN + any https (for user-uploaded)
      "img-src 'self' data: blob: https:",
      // API connections
      "connect-src 'self' https://clerk.avidiatech.com https://*.supabase.co https://api.stripe.com https://*.sentry.io https://ingest.sentry.io https://vitals.vercel-insights.com",
      // iFrames: Stripe 3DS
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      // Media
      "media-src 'self'",
      // Workers: self only
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure prompt/profile artifacts are included in serverless output traces.
  outputFileTracingIncludes: {
    "/*": ["./tools/render-engine/prompts/**/*"],
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
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
