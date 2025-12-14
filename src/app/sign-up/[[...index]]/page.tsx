"use client";

import { useEffect } from "react";
import { SignUp, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push(redirectTo);
    }
  }, [isLoaded, isSignedIn, router, redirectTo]);

  // Keep a compact centered container but DO NOT duplicate the "Create your account" heading.
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        {/* Canonical Clerk SignUp component — it renders its own header */}
        <SignUp path="/sign-up" routing="path" />
      </div>
    </main>
  );
}
