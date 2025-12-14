"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const params = useSearchParams();
  const redirect = params?.get("redirect") ?? params?.get("redirect_url") ?? "/dashboard";

  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [clerkFailed, setClerkFailed] = useState(false);
  const [clerkErrorText, setClerkErrorText] = useState<string | null>(null);

  // Helper to detect Clerk UI elements on the page (same as before)
  function hasClerkUI(): boolean {
    if (typeof document === "undefined") return false;
    const selectors = [
      "[data-clerk-modal]",
      ".clerk-modal",
      ".clerk-sign-in",
      ".clerk-root",
      "#__clerk_root",
      "form[action*=\"/sign-in\"]",
      "input[name=\"identifier\"]",
      "input[name=\"email\"]",
    ];
    return selectors.some((sel) => !!document.querySelector(sel));
  }

  // If signed in, redirect immediately
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace(redirect);
    }
  }, [isLoaded, isSignedIn, router, redirect]);

  // Fallback detection: wait longer and don't show fallback if Clerk is initializing or a session exists.
  useEffect(() => {
    const timeoutMs = 8000; // longer grace period for Clerk to initialize
    const t = setTimeout(async () => {
      // If Clerk UI is already present, bail out (no failure)
      if (hasClerkUI()) return;

      // If Clerk's runtime has a session present, bail out (do not show fallback)
      // (window.Clerk may not exist during early initialization)
      try {
        // @ts-ignore - runtime check
        const runtimeClerk = (window as any).Clerk;
        const sess = runtimeClerk?.session;
        // If a session exists and is not explicitly expired, we consider Clerk present
        if (sess && typeof sess.status === "string" && sess.status !== "expired") {
          return;
        }
      } catch (e) {
        // ignore
      }

      // If we've reached here, Clerk UI didn't appear and no client session present -> treat as failed
      setClerkFailed(true);

      // Attempt to fetch Clerk client for diagnostics (same as before)
      try {
        const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || "";
        const url = `https://${frontendApi}/v1/client`;
        const res = await fetch(url);
        const text = await res.text();
        setClerkErrorText(`status:${res.status} body: ${text}`);
      } catch (e: any) {
        setClerkErrorText(String(e));
      }
    }, timeoutMs);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        {!clerkFailed ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl={redirect} />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="text-sm text-slate-600">We couldn't load the sign-in widget. You can try one of the options below:</p>
            <div className="flex flex-col gap-2">
              <a href="/sign-up" className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white">
                Create an account
              </a>
              <a href="/" className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium">
                Back to home
              </a>
              <button onClick={() => location.reload()} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm border">
                Retry loading
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              <p>If this persists, please check the browser console or paste the Clerk error below for help:</p>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-red-600">{clerkErrorText ?? "No detailed error captured yet."}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
