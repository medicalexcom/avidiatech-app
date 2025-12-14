"use client";

import React, { useEffect } from "react";
import { OrganizationProfile, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * /settings/organization
 *
 * Single canonical organization management page: shows Clerk's OrganizationProfile
 * for signed-in users. If Clerk Orgs are disabled, it shows an explanatory message
 * (no inline CreateOrganization widget to avoid duplication).
 */

export default function OrganizationSettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const redirect = "/settings/organization";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [isLoaded, isSignedIn, router, redirect]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <a href="/dashboard" className="text-sm text-slate-600 inline-flex items-center gap-2">
            ← Back to dashboard
          </a>
          <h1 className="text-2xl font-semibold mt-2">Organization settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your organization, members, and permissions.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
          {/* Render Clerk's OrganizationProfile. We avoid passing Clerk-specific props
              that may not exist in the installed @clerk/nextjs types; appearance is passed
              as `any` to keep TypeScript happy while still applying styling. */}
          <OrganizationProfile
            {...({
              appearance: {
                elements: {
                  rootBox: "w-full",
                },
              },
            } as any)}
          />

          <div className="mt-4 text-sm text-slate-500">
            Note: if Clerk Organizations are not enabled for this instance, organization management won't be available here. Contact support to enable Organizations for your account.
          </div>
        </div>
      </div>
    </main>
  );
}
