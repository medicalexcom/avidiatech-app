import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// TEMP diagnostic middleware — narrow/replace after debugging.
// Logs a message for every non-static request and invokes clerkMiddleware().

const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  // quick log to confirm Next executed this file
  console.log("[DIAG-middleware] incoming:", req.nextUrl.pathname);

  try {
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) {
      console.log("[DIAG-middleware] clerkMiddleware returned a Response for", req.nextUrl.pathname);
      return maybeResponse;
    }
    console.log("[DIAG-middleware] clerkMiddleware finished for", req.nextUrl.pathname);
  } catch (err) {
    console.warn("[DIAG-middleware] clerkMiddleware error:", String(err));
  }

  // Continue request chain — we are not blocking anything in this diagnostic run
  return NextResponse.next();
}

// Broad matcher for diagnostics so we don't miss the route
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
