"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Centered minimal sign-in page
 * - Keeps only a lightweight layout wrapper to center Clerk's canonical SignIn component.
 * - Does NOT add headings or additional chrome to avoid duplication.
 */
export default function SignInPage() {
  const params = useSearchParams();
  const redirect = params?.get("redirect") ?? params?.get("redirect_url") ?? "/dashboard";

  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace(redirect);
    }
  }, [isLoaded, isSignedIn, router, redirect]);

  // Minimal wrapper to center the Clerk widget in the viewport
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl={redirect} />
      </div>
    </main>
  );
}
