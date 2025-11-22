import { clerkMiddleware } from "@clerk/nextjs";

// Ensure this file is placed at src/middleware.ts (not src/src/).
export default clerkMiddleware();

export const config = {
  matcher: [
    "/api/:path*",
    // match all app routes except Next static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
