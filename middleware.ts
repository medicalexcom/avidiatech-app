import type { NextRequest } from "next/server";
import srcMiddleware from "./src/middleware";

// IMPORTANT: Next.js requires `config` to be defined in THIS file (no re-export).
export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/api/:path*"],
};

export default function middleware(req: NextRequest) {
  return srcMiddleware(req);
}
