// src/proxy.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// This proxy runs on every request matching the config below.
// It can be async if you need to await data (e.g., fetch).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Example: rewrite requests under /about to /about-2
  if (pathname.startsWith('/about')) {
    return NextResponse.rewrite(new URL('/about-2', request.url))
  }

  // Default: continue to the requested route
  return NextResponse.next()
}

// Optional config: specify which paths invoke this proxy.
// Without this, the proxy runs on every path.
export const config = {
  matcher: ['/about/:path*'],  // change to suit your routing needs
}
