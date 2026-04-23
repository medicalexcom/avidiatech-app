// url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/lib/clerkSafe.ts
/**
 * safeGetAuth(req)
 *
 * Defensive wrapper around Clerk's getAuth for environments where clerkMiddleware
 * may not be initialized (build / CI / tests). Returns a minimal auth object or
 * { userId: null } on error rather than allowing getAuth() to run unchecked.
 *
 * Usage: call safeGetAuth(req) INSIDE your request handlers (not at module top-level).
 */
type SafeAuthResult = {
  userId?: string | null;
  sessionId?: string | null;
  actor?: unknown;
  authError?: "auth_unavailable";
};

type ClerkAuthShape = {
  getAuth?: (req: unknown) => { userId?: string | null; sessionId?: string | null; actor?: unknown };
};

export function isAuthUnavailableError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as any).code === "auth_unavailable");
}

function maybeThrowStrictAuthError(strict?: boolean): SafeAuthResult {
  if (strict) {
    const err: any = new Error("auth_unavailable");
    err.code = "auth_unavailable";
    throw err;
  }
  return { userId: null, authError: "auth_unavailable" };
}

export function safeGetAuth(
  req: unknown,
  opts?: { strict?: boolean }
): SafeAuthResult {
  // Quick short-circuit: if essential Clerk env is not present, avoid requiring Clerk.
  // This prevents build-time/CI warnings where Clerk can't detect middleware.
  if (!process.env.CLERK_SECRET && !process.env.NEXT_PUBLIC_CLERK_FRONTEND_API && !process.env.NEXT_PUBLIC_CLERK_FRONTEND) {
    return maybeThrowStrictAuthError(opts?.strict);
  }

  try {
    // Require at runtime to avoid top-level Clerk initialization during build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerk = require("@clerk/nextjs/server") as ClerkAuthShape;
    if (clerk && typeof clerk.getAuth === "function") {
      try {
        // getAuth expects the Next Request-like object in your handlers
        return clerk.getAuth(req);
      } catch (err) {
        // getAuth might still throw if middleware not detected; swallow it and return null userId
        // but keep the error in logs for diagnostics
        // eslint-disable-next-line no-console
        console.warn("safeGetAuth: getAuth threw:", String(err));
        return maybeThrowStrictAuthError(opts?.strict);
      }
    }
  } catch (e) {
    // Clerk package not available or require failed (build/CI). Return safe fallback.
    // eslint-disable-next-line no-console
    console.warn("safeGetAuth: @clerk/nextjs/server not available at runtime:", String(e));
    return maybeThrowStrictAuthError(opts?.strict);
  }

  return maybeThrowStrictAuthError(opts?.strict);
}
