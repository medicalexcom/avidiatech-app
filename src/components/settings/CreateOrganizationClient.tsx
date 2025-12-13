"use client";

import React, { useEffect } from "react";
import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationClient() {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[CreateOrganizationClient] mounted");
  }, []);

  return (
    <div>
      <CreateOrganization afterCreateOrganizationUrl="/dashboard/import" />
      <div className="mt-3 text-xs text-slate-500">
        If you cannot interact with this form, check that Clerk Organizations are enabled for this instance.
      </div>
    </div>
  );
}
