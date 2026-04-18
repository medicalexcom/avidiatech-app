import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TenantSettingsPage from "@/components/settings/TenantSettingsPage";
import { getTenantContextForUser } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";

export const metadata: Metadata = {
  title: "Tenant Settings | AvidiaTech",
  description: "Configure content generation profiles and organization settings",
};

export default async function SettingsPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const claims = (sessionClaims ?? {}) as Record<string, any>;
  const userEmail = extractEmailFromSessionClaims(sessionClaims);
  let canManageProfiles = false;

  let tenantId =
    claims.tenant_id ||
    claims.metadata?.tenantId ||
    claims.publicMetadata?.tenantId ||
    null;

  try {
    const context = await getTenantContextForUser({
      userId,
      requestedTenantId: tenantId ?? undefined,
      userEmail,
    });
    tenantId = context.tenantId;
    canManageProfiles = context.role === "owner";
  } catch (error) {
    console.warn("settings: tenant resolution via billing context failed", error);
  }

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

  return (
    <TenantSettingsPage
      tenantId={String(tenantId)}
      canManageProfiles={canManageProfiles}
    />
  );
}
