"use client";

import React from "react";
import { CreateOrganization, useUser } from "@clerk/nextjs";

export default function CreateOrganizationClient() {
  const { isLoaded, isSignedIn } = useUser();

  // Don't render the Clerk create form until Clerk runtime is ready and user is signed in.
  if (!isLoaded || !isSignedIn) return null;

  return (
    <div>
      <CreateOrganization afterCreateOrganizationUrl="/dashboard/import" />
      <div className="mt-3 text-xs text-slate-500">
        If you cannot interact with this form, check that Clerk Organizations are enabled for this instance.
      </div>
    </div>
  );
}
