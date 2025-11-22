"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  // Read the public frontend API value from env (this is public and safe to expose client-side).
  // For a custom domain this should be the hostname only, e.g. clerk.avidiatech.com (no https://).
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;

  return <ClerkProvider frontendApi={frontendApi}>{children}</ClerkProvider>;
}
