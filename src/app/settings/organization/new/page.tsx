"use client";

import React, { useEffect } from "react";
import { CreateOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * /settings/organization/new
 *
 * Minimal page that renders only Clerk's canonical CreateOrganization component.
 * No app-level header/card/wrappers to avoid visual duplication.
 * Keeps a lightweight centered container for viewport placement.
 */

export default function CreateOrganizationPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const redirect = "/settings/organization/new";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [isLoaded, isSignedIn, router, redirect]);

  // Avoid rendering until Clerk runtime is loaded and the user is signed in
  if (!isLoaded || !isSignedIn) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Render only Clerk's canonical CreateOrganization UI */}
        <CreateOrganization afterCreateOrganizationUrl="/dashboard/import" />
      </div>
    </main>
  );
}
