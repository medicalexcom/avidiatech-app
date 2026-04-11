"use client";

import React, { useEffect } from "react";
import { OrganizationSwitcher, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Client-side chooser: must be a client component because it uses client hooks.
 */
export default function ChooseOrganizationClient() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const afterSignIn =
    searchParams.get("after_sign_in_url") ??
    searchParams.get("after_sign_up_url") ??
    searchParams.get("redirect_url") ??
    "/dashboard";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(afterSignIn)}`);
    }
  }, [isLoaded, isSignedIn, router, afterSignIn]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <main className="dark relative min-h-screen flex items-center justify-center p-6 bg-slate-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#06b6d4 100%)" }} />
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">Choose an organization</h2>
        <p className="text-sm text-slate-400 mb-4">
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
