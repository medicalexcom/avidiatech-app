"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoStack } from "@/components/brand/LogoMark";

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
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 overflow-hidden dark:bg-[#09090b]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-400/12 blur-[120px] dark:bg-indigo-500/8" />
        <div className="absolute bottom-0 left-[-5%] h-[400px] w-[400px] rounded-full bg-violet-400/10 blur-[100px] dark:bg-violet-500/8" />
      </div>
      {/* Top identity stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8">
          <LogoStack />
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl={redirect}
          signInUrl="/sign-in"
        />
        <p className="mt-6 text-center text-[12px] text-slate-400 dark:text-slate-500">
          By creating an account you agree to our{" "}
          <a href="/legal/terms" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">Terms</a>
          {" "}and{" "}
          <a href="/legal/privacy" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
