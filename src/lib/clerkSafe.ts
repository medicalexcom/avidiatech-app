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
export function safeGetAuth(req: any): { userId?: string | null; sessionId?: string | null; actor?: any } {
  // Quick short-circuit: if essential Clerk env is not present, avoid requiring Clerk.
  // This prevents build-time/CI warnings where Clerk can't detect middleware.
  if (!process.env.CLERK_SECRET && !process.env.NEXT_PUBLIC_CLERK_FRONTEND_API && !process.env.NEXT_PUBLIC_CLERK_FRONTEND) {
    return { userId: null };
  }

  try {
    // Require at runtime to avoid top-level Clerk initialization during build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerk = require("@clerk/nextjs/server");
    if (clerk && typeof clerk.getAuth === "function") {
      try {
        // getAuth expects the Next Request-like object in your handlers
        return clerk.getAuth(req);
      } catch (err) {
        // getAuth might still throw if middleware not detected; swallow it and return null userId
        // but keep the error in logs for diagnostics
        // eslint-disable-next-line no-console
        console.warn("safeGetAuth: getAuth threw:", String(err));
        return { userId: null };
      }
    }
  } catch (e) {
    // Clerk package not available or require failed (build/CI). Return safe fallback.
    // eslint-disable-next-line no-console
    console.warn("safeGetAuth: @clerk/nextjs/server not available at runtime:", String(e));
    return { userId: null };
  }

  return { userId: null };
}
