"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const params = useSearchParams();
  const redirect = params?.get("redirect_url") ?? "/dashboard";

  // Fallback only if Clerk never initializes; keep this minimal and ensure
  // it doesn't render if a Clerk modal is present.
  const [clerkFailed, setClerkFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      // do a quick DOM check: if a Clerk modal is present, do NOT show fallback
      const modalPresent = !!document.querySelector('[data-clerk-modal], .clerk-modal');
      if (!modalPresent) setClerkFailed(true);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded bg-white p-8 shadow">
        {!clerkFailed ? (
          <SignIn afterSignInUrl={redirect} />
        ) : (
          <div>
            <h2>Sign in</h2>
            <p>We couldn't load the sign-in widget. Try an option below:</p>
            <a href="/sign-up" className="btn-primary">Create an account</a>
            <a href="/" className="btn-ghost">Back to home</a>
            <button onClick={() => location.reload()} className="btn">Retry loading</button>
          </div>
        )}
      </div>
    </div>
  );
}
