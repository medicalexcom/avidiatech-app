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
    <main className="dark relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,#06b6d4 0%,#8b5cf6 100%)" }} />
      <div className="w-full max-w-md">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl={redirect} />
      </div>
    </main>
  );
}
