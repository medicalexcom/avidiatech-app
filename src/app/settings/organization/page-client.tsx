"use client";

import React, { useEffect } from "react";
import { OrganizationProfile, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

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
    <div className="space-y-6">
      {/* Page heading */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Organization</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          Manage your organization profile, members, and settings.
        </p>
      </div>

      {/* Clerk OrganizationProfile */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <OrganizationProfile
          {...({
            appearance: {
              elements: {
                rootBox: "w-full",
                card: "shadow-none rounded-none border-0",
              },
            },
          } as any)}
        />
      </div>
    </div>
  );
}
