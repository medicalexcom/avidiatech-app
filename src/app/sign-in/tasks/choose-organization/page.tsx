"use client";

import React, { useEffect } from "react";
import { OrganizationSwitcher, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * A lightweight choose-organization page that:
 * - redirects signed-out users to /sign-in with redirect param
 * - shows an OrganizationSwitcher for signed-in users (navigation mode)
 * This avoids relying on Clerk embedding a special flow at /sign-in/tasks/choose-organization
 */

export default function ChooseOrganizationPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Respect Clerk query params commonly used in redirects
  const afterSignIn = searchParams.get("after_sign_in_url") ?? searchParams.get("after_sign_up_url") ?? searchParams.get("redirect_url") ?? "/dashboard";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // Not signed in => go to canonical sign-in (Clerk will return here after auth)
      router.replace(`/sign-in?redirect=${encodeURIComponent(afterSignIn)}`);
    }
  }, [isLoaded, isSignedIn, router, afterSignIn]);

  // While loading auth state or redirecting, show nothing (or a spinner)
  if (!isLoaded || !isSignedIn) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Choose an organization</h2>
        <p className="text-sm text-slate-600 mb-4">
          Select an organization to continue. You can also create a new one.
        </p>

        <OrganizationSwitcher
          hidePersonal={false}
          createOrganizationMode="navigation"
          createOrganizationUrl="/settings/organization/new"
          organizationProfileMode="navigation"
          organizationProfileUrl="/settings/organization"
          afterSelectOrganizationUrl={afterSignIn}
          afterCreateOrganizationUrl={afterSignIn}
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full h-9 justify-between rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
            },
          }}
        />
      </div>
    </main>
  );
}
