import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV || "development";

export function initSentry() {
  if (!dsn) return;
  if ((Sentry as any).__initialized) return;
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0"),
  });
  (Sentry as any).__initialized = true;
}

export function captureException(e: any) {
  try {
    if (!dsn) return;
    Sentry.captureException(e);
  } catch (err) {
    // noop
    // eslint-disable-next-line no-console
    console.warn("Sentry capture failed", err);
  }
}
