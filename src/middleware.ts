import { withClerkMiddleware } from "@clerk/nextjs/server";

// Use withClerkMiddleware so getAuth() works in server routes and pages.
// Keep the matcher broad enough to include API routes and app pages.
export default withClerkMiddleware();

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
