"use client";

import React from "react";
import { CreateOrganization, useUser } from "@clerk/nextjs";

export default function CreateOrganizationClient() {
  const { isLoaded, isSignedIn } = useUser();

  // Wait until Clerk is ready and the user is signed in
  if (!isLoaded || !isSignedIn) return null;

  // Render only Clerk's canonical CreateOrganization widget (no extra wrapper)
  return <CreateOrganization afterCreateOrganizationUrl="/dashboard/import" />;
}
