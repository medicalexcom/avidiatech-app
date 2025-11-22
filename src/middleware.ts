import { clerkMiddleware } from "@clerk/nextjs";

// Ensure this file is placed at src/middleware.ts (because you use the src/ App Router).
// The matcher below covers API routes and all pages except Next static assets.
export default clerkMiddleware();

export const config = {
  matcher: [
    // include API routes and all pages so getAuth() works in server routes and pages
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
