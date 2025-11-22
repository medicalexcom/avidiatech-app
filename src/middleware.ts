import { authMiddleware } from "@clerk/nextjs";
export default authMiddleware();

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
