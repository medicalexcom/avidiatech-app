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

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Create your account</h2>
        {/* Render SignUp inline (no modal) */}
        <SignUp path="/sign-up" routing="path" />
        <p className="mt-4 text-sm text-slate-500">After sign-up you'll be redirected to your dashboard.</p>
      </div>
    </main>
  );
}
