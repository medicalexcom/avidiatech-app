// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the Next.js server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable in development to avoid noise
  enabled: process.env.NODE_ENV === "production",

  // Capture 5% of transactions for performance monitoring (lower to reduce cost)
  tracesSampleRate: 0.05,

  // Set the environment tag
  environment: process.env.NODE_ENV ?? "development",

  // Ignore common non-actionable errors
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],

  beforeSend(event) {
    // Strip PII from stack traces in production
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
