"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function Providers({ children }: { children: ReactNode }) {
  if (!clerkKey) return <>{children}</>;
  return <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider>;
}
