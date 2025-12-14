"use client";

import { useEffect } from "react";

/**
 * Temporary diagnostic component — prints Clerk + cookie info to the console.
 * Remove this file and its import from layout.tsx after debugging.
 *
 * It only logs public info (NEXT_PUBLIC_*) and client-side Clerk state.
 */

export default function ClerkDebug() {
  useEffect(() => {
    try {
      console.group("[ClerkDebug] start");
      // Environment values exposed to client (publishable/frontend api)
      console.log("NEXT_PUBLIC_CLERK_FRONTEND_API:", process.env.NEXT_PUBLIC_CLERK_FRONTEND_API);
      console.log("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

      // Document cookies (helps identify cookie domain/samesite)
      try {
        console.log("document.cookie:", document.cookie);
      } catch (e) {
        console.warn("Could not read document.cookie", e);
      }

      // All cookie stores visible under different hosts (quick snapshot)
      // NOTE: to see cookies set for clerk.* domain you must inspect Application tab.
      if (typeof window !== "undefined") {
        // Print window.Clerk (if present) and its session
        if ((window as any).Clerk) {
          // safe shallow print
          try {
            console.log("window.Clerk:", {
              hasClerk: true,
              frontendApi: (window as any).Clerk?.frontendApi,
              session: (window as any).Clerk?.session ? { id: (window as any).Clerk.session.id, status: (window as any).Clerk.session.status } : null,
              user: (window as any).Clerk?.user ? { id: (window as any).Clerk.user.id, primaryEmail: (window as any).Clerk.user.emailAddresses?.[0]?.emailAddress } : null,
            });
          } catch (e) {
            console.warn("Error reading window.Clerk", e);
          }
        } else {
          console.log("window.Clerk: not available yet");
        }
      }
      console.groupEnd();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("ClerkDebug encountered an error", err);
    }
  }, []);

  return null;
}
