"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SignUp, useSignUp } from "@clerk/nextjs";
import React, { useEffect } from "react";

export default function SignUpPage() {
  // Clerk's SignUp component handles the form. We can watch for sign-up completion and redirect.
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // If you need to perform a programmatic redirect after successful sign-up,
  // you can listen to Clerk events or use the useSignUp hook. Below is a minimal placeholder.
  // If you want automatic redirect on success, implement a useEffect that checks session and pushes redirect.

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Create your account</h2>
        {/* routing="path" ensures the SignUp UI is rendered inline instead of a modal */}
        <SignUp path="/sign-up" routing="path" />
        <p className="mt-4 text-sm text-slate-500">
          After sign-up you'll be redirected to the dashboard to pick a plan.
        </p>
      </div>
    </main>
  );
}
