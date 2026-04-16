/**
 * app/settings/page.tsx
 * 
 * Next.js page component that renders the tenant settings interface.
 * This would typically be placed in your app's settings or admin section.
 */

import { Metadata } from "next";
import { auth } from "@clerk/nextjs";
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
  // This assumes your Clerk configuration includes tenant information
  // Adjust the path based on your actual session claims structure
  const tenantId = (sessionClaims as any)?.tenant_id || 
                  (sessionClaims as any)?.metadata?.tenantId ||
                  (sessionClaims as any)?.publicMetadata?.tenantId;

  // If no tenant ID is available, show an error or redirect
  if (!tenantId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-4 text-muted-foreground">
            No tenant association found. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <TenantSettingsPage tenantId={tenantId} />;
}
