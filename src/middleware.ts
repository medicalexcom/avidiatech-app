import { authMiddleware } from "@clerk/nextjs";

// Use authMiddleware() so getAuth() works in server routes and pages.
// Keep the matcher broad enough to include API routes and app pages.
export default authMiddleware();

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
