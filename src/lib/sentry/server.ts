import type * as SentryType from "@sentry/node";

let Sentry: typeof SentryType | null = null;

try {
  // Use require so TypeScript/Next doesn't statically fail when the package is not installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  Sentry = require("@sentry/node") as typeof SentryType;
} catch (e) {
  // Module not installed — fall back to no-op
  Sentry = null;
}

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV || "development";

export function initSentry() {
  if (!Sentry) return;
  if (!dsn) return;
  // avoid double-init
  // @ts-expect-error internal flag
  if ((Sentry as any).__initialized) return;

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0"),
  });
  // @ts-expect-error internal flag
  (Sentry as any).__initialized = true;
}

export function captureException(e: any) {
  try {
    if (!Sentry) return;
    Sentry.captureException(e);
  } catch (err) {
    // noop — don't let telemetry break app
    // eslint-disable-next-line no-console
    console.warn("Sentry capture failed", err);
  }
}
