"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Minimal sign-in page that renders only Clerk's canonical SignIn component.
 * No outer wrappers / headings / fallback markup to avoid duplication.
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

  // Render only the Clerk SignIn UI (it provides its own header and card).
  // We intentionally avoid any additional container that would duplicate visual chrome.
  return <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl={redirect} />;
}
