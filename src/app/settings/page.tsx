/**
 * app/settings/page.tsx
 * 
 * Main settings page with tenant profile configuration.
 * Uses proper Clerk authentication with server components.
 */

import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TenantSettingsPage from "@/components/settings/TenantSettingsPage";

export const metadata: Metadata = {
  title: "Tenant Settings | AvidiaTech",
  description: "Configure content generation profiles and organization settings",
};

export default async function SettingsPage() {
  // Get authentication from Clerk
  const { userId, sessionClaims } = auth();

  // Redirect if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Extract tenant ID from session claims
  // Adjust this path based on your actual Clerk configuration
  const tenantId = (sessionClaims as any)?.tenant_id || 
                  (sessionClaims as any)?.metadata?.tenantId ||
                  (sessionClaims as any)?.publicMetadata?.tenantId ||
                  // Fallback: use userId if no tenant structure configured
                  userId;

  return <TenantSettingsPage tenantId={tenantId} />;
}
