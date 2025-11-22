import { clerkMiddleware } from "@clerk/nextjs/server";

// Attach Clerk middleware so getAuth(req) can detect sessions in API routes and pages.
// Keep the matcher broad enough to include API routes and app pages while skipping Next internals.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
