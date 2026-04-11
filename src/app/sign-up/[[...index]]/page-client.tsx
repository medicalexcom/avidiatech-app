"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignUpPage() {
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

  return (
    <main className="dark relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,#d946ef 0%,#6366f1 100%)" }} />
      <div className="w-full max-w-md">
        <SignUp routing="path" path="/sign-up" afterSignUpUrl={redirect} signInUrl="/sign-in" />
      </div>
    </main>
  );
}
