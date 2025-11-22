"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const params = useSearchParams();
  // read the redirect_url query param (used by the CTAs) and pass it to Clerk's SignIn
  const redirect = params?.get("redirect_url") ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl={redirect} />
      </div>
    </div>
  );
}
