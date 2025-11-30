// Lightweight safe wrapper around Clerk's getAuth to avoid runtime warnings when middleware
// is not detected. Non-throwing: returns { userId: null } on failure.
export function safeGetAuth(req: any) {
  try {
    // Require inside the function so importing this file during build doesn't force Clerk to initialize.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAuth } = require("@clerk/nextjs/server");
    return getAuth(req);
  } catch (err) {
    // Keep logs minimal and non-sensitive. This silences Clerk's runtime warning by returning a neutral auth object.
    // Callers should treat userId === null as unauthenticated.
    // eslint-disable-next-line no-console
    console.warn("safeGetAuth: getAuth unavailable or failed:", String(err));
    return { userId: null };
  }
}
